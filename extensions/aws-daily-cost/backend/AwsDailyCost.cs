using Amazon.CostExplorer;
using Amazon.CostExplorer.Model;
using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Duplo.Ai.Studio.Extensibility.Infra;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.AwsDailyCost;

[BsonIgnoreExtraElements]
public class AwsDailyCostSpec : BaseSpec
{
    /// <summary>Month in YYYY-MM format, e.g. "2026-09". Defaults to current month if blank.</summary>
    public string? Month { get; set; }

    /// <summary>AWS region to contact Cost Explorer (us-east-1 is required for Cost Explorer API).</summary>
    public string Region { get; set; } = "us-east-1";

    /// <summary>Optional: group costs by SERVICE (default) or LINKED_ACCOUNT.</summary>
    public string GroupBy { get; set; } = "SERVICE";
}

[BsonIgnoreExtraElements]
public class CostEntry
{
    public string Date { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public double Amount { get; set; }
    public string Unit { get; set; } = "USD";
}

[BsonIgnoreExtraElements]
public class AwsDailyCostResult : BaseResult
{
    public List<CostEntry> CostEntries { get; set; } = new();
    public double TotalCost { get; set; }
    public string Currency { get; set; } = "USD";
    public string? QueryMonth { get; set; }
}

[BsonCollection("extension_awsdailycost")]
public class AwsDailyCost : ResourceBase<AwsDailyCostSpec, AwsDailyCostResult>
{
    public override string GetTicketOriginType() => "AwsDailyCost";
    public override string GetTicketOriginSubType() => "aws-daily-cost";
}

public class AwsDailyCostHooks : DefaultEntityHooks<AwsDailyCost>
{
}

public class AwsDailyCostService : ResourceServiceBase<AwsDailyCost, AwsDailyCostSpec, AwsDailyCostResult>
{
    private readonly IScopeClientFactory _clients;

    public AwsDailyCostService(
        IRepository<AwsDailyCost> repository,
        ILogger<AwsDailyCostService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor,
        IScopeClientFactory clients)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
        _clients = clients;
    }

    // No provisioning needed — resource is observe-only; it just reads Cost Explorer on each GET.
    protected override bool IsProvisioningNeeded(AwsDailyCost entity) => false;

    protected override async Task EnrichResultAsync(AwsDailyCost entity, CancellationToken ct)
    {
        var spec = entity.Spec;

        // Resolve the month window; default to the current UTC month.
        var month = spec?.Month;
        DateTime start;
        if (string.IsNullOrWhiteSpace(month) ||
            !DateTime.TryParseExact(month + "-01", "yyyy-MM-dd",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out start))
        {
            var now = DateTime.UtcNow;
            start = new DateTime(now.Year, now.Month, 1);
        }
        var end = start.AddMonths(1);

        var scopeIds = spec?.ScopeIds ?? new List<string>();
        var region = string.IsNullOrWhiteSpace(spec?.Region) ? "us-east-1" : spec!.Region;
        var groupBy = string.IsNullOrWhiteSpace(spec?.GroupBy) ? "SERVICE" : spec!.GroupBy;

        try
        {
            using var ce = await _clients.CreateAwsClientAsync(
                scopeIds, region,
                (creds, reg) => new AmazonCostExplorerClient(creds, reg),
                ct: ct);

            var req = new GetCostAndUsageRequest
            {
                TimePeriod = new DateInterval
                {
                    Start = start.ToString("yyyy-MM-dd"),
                    End = end.ToString("yyyy-MM-dd"),
                },
                Granularity = Granularity.DAILY,
                Metrics = new List<string> { "UnblendedCost" },
                GroupBy = new List<GroupDefinition>
                {
                    new GroupDefinition { Type = GroupDefinitionType.DIMENSION, Key = groupBy },
                },
            };

            var resp = await ce.GetCostAndUsageAsync(req, ct);

            var entries = new List<CostEntry>();
            double total = 0;
            string currency = "USD";

            foreach (var result in resp.ResultsByTime)
            {
                foreach (var group in result.Groups)
                {
                    var metric = group.Metrics["UnblendedCost"];
                    if (!double.TryParse(metric.Amount, System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture, out var amount))
                        amount = 0;
                    currency = metric.Unit;
                    total += amount;
                    entries.Add(new CostEntry
                    {
                        Date = result.TimePeriod.Start,
                        Group = group.Keys.FirstOrDefault() ?? string.Empty,
                        Amount = Math.Round(amount, 4),
                        Unit = currency,
                    });
                }
            }

            entity.Result ??= new AwsDailyCostResult();
            entity.Result.CostEntries = entries;
            entity.Result.TotalCost = Math.Round(total, 4);
            entity.Result.Currency = currency;
            entity.Result.QueryMonth = start.ToString("yyyy-MM");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            entity.Result ??= new AwsDailyCostResult();
            entity.Result.QueryMonth = start.ToString("yyyy-MM");
        }
    }
}
