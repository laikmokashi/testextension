using Duplo.Ai.DataManagement.Interfaces;
using Duplo.Ai.DataManagement.Services;
using Duplo.Ai.Model.Attributes;
using Duplo.Ai.Model.Interfaces;
using Duplo.Ai.Model.Resource;
using Duplo.Ai.Studio.Extensibility.Infra;
using Amazon.EC2;
using Amazon.EC2.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson.Serialization.Attributes;

namespace Duplo.Extension.AwsResourceList;

[BsonIgnoreExtraElements]
public class AwsResourceListSpec : BaseSpec
{
    public string? Region { get; set; }
}

[BsonIgnoreExtraElements]
public class AwsResourceListResult : BaseResult
{
    public List<Ec2InstanceInfo> Instances { get; set; } = new();
}

public class Ec2InstanceInfo
{
    public string? InstanceId { get; set; }
    public string? InstanceType { get; set; }
    public string? State { get; set; }
    public string? Name { get; set; }
    public string? PublicIpAddress { get; set; }
}

[BsonCollection("extension_awsresourcelist")]
public class AwsResourceList : ResourceBase<AwsResourceListSpec, AwsResourceListResult>
{
    public override string GetTicketOriginType() => "AwsResourceList";
    public override string GetTicketOriginSubType() => "aws-resource-list";
}

public class AwsResourceListHooks : DefaultEntityHooks<AwsResourceList>
{
}

public class AwsResourceListService : ResourceServiceBase<AwsResourceList, AwsResourceListSpec, AwsResourceListResult>
{
    private readonly IScopeClientFactory _clients;
    private readonly ILogger<AwsResourceListService> _svcLogger;

    public AwsResourceListService(
        IRepository<AwsResourceList> repository,
        ILogger<AwsResourceListService> logger,
        IServiceScopeFactory scopeFactory,
        IHttpContextAccessor httpContextAccessor,
        IScopeClientFactory clients)
        : base(repository, logger, scopeFactory, httpContextAccessor)
    {
        _clients = clients;
        _svcLogger = logger;
    }

    // Agent-provisioned: platform fires a skill ticket on create; EnrichResultAsync adds live state on every GET.
    protected override async Task EnrichResultAsync(AwsResourceList entity, CancellationToken ct)
    {
        var region = entity.Spec?.Region;
        if (string.IsNullOrWhiteSpace(region)) return;

        var scopeIds = entity.Spec?.ScopeIds ?? new List<string>();

        try
        {
            using var ec2 = await _clients.CreateAwsClientAsync(
                scopeIds,
                region,
                (creds, endpoint) => new AmazonEC2Client(creds, endpoint),
                ct: ct);

            var response = await ec2.DescribeInstancesAsync(new DescribeInstancesRequest(), ct);

            if (entity.Result == null) return;

            entity.Result.Instances = response.Reservations
                .SelectMany(r => r.Instances)
                .Select(i => new Ec2InstanceInfo
                {
                    InstanceId = i.InstanceId,
                    InstanceType = i.InstanceType?.ToString(),
                    State = i.State?.Name?.ToString(),
                    Name = i.Tags?.FirstOrDefault(t => t.Key == "Name")?.Value,
                    PublicIpAddress = i.PublicIpAddress,
                })
                .ToList();
        }
        catch (Exception ex)
        {
            // Enrichment failures must not 500 the GET — log and leave Result as-is.
            _svcLogger.LogWarning(ex, "EC2 enrichment failed for {Id}", entity.Id);
        }
    }
}
