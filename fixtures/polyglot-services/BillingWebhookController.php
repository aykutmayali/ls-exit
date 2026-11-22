<?php

use LemonSqueezy\Laravel\Http\Controllers\WebhookController;

class BillingWebhookController extends WebhookController
{
    public function handleOrderCreated($payload)
    {
        $event = 'order_created';
        return $event;
    }
}
