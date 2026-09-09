using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.AwsDailyCost;

[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/aws-daily-costs")]
public class AwsDailyCostController : ResourcesController<AwsDailyCost, AwsDailyCostSpec, AwsDailyCostResult>
{
    public AwsDailyCostController(IEntityService<AwsDailyCost> service, ILogger<AwsDailyCostController> logger)
        : base(service, logger)
    {
    }
}
