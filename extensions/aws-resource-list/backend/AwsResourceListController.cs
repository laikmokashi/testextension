using Duplo.Ai.DataManagement.Controllers.User.Resource;
using Duplo.Ai.Model.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Duplo.Extension.AwsResourceList;

[ApiController]
[Route("v1/aiservicedesk/user/data/workspaces/{workspaceId}/environment/extensions/aws-resource-lists")]
public class AwsResourceListsController : ResourcesController<AwsResourceList, AwsResourceListSpec, AwsResourceListResult>
{
    public AwsResourceListsController(IEntityService<AwsResourceList> service, ILogger<AwsResourceListsController> logger)
        : base(service, logger)
    {
    }
}
