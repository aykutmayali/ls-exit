using Microsoft.AspNetCore.Mvc;
using LemonSqueezy.Net;

public class BillingController : ControllerBase
{
    public IActionResult HandleWebhook()
    {
        var sig = Request.Headers["X-Signature"];
        var evt = Request.Headers["X-Event-Name"];
        if (evt == "order_created")
        {
            var url = "https://api.lemonsqueezy.com/v1/orders";
        }
        return Ok();
    }
}
