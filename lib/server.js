var _ = require('lodash')
var config = require('./config')
var Nudge = require('hapi-nudge')
var Hapi = require('hapi')
var Joi = require('joi')
var stripe = require('stripe')(config.stripeSecretKey)

var PATHNAME = '/'

var server = new Hapi.Server()

module.exports = server

server.app.PATHNAME = PATHNAME

server.connection({
    port: config.port,
})

if (config.appName) {
    server.register({
        register: Nudge,
        options: {
            host: [
                config.appName,
                '.herokuapp.com',
            ].join(''),
            pathname: '/uptime',
            protocol: 'https',
        },
    }, function (err) { if (err) throw err })
}

server.route({
    config: {
        cors: {
            origin: config.corsOrigins,
        },
        validate: {
            payload: {
                amount: Joi.number().integer().greater(50).required(),
                description: Joi.string(),
                buybtcaddress: Joi.string(),
                metadata: Joi.object().keys({

                email: Joi.string().email(),
                btcaddress: Joi.string(),
                btcamount:  Joi.number(),
                btcprice: Joi.number(),
                }),

                stripeToken: Joi.string().token().required(),
                stripeTokenType: Joi.string().regex(/^source$/),
                stripeEmail: Joi.string().email().required(),
            },
        },
    },
    handler: function (request, reply) {
        var options = {
            amount: request.payload.amount,
            currency: config.currency,
            source: request.payload.stripeToken,
            description: request.payload.description,
            metadata: request.payload.metadata,
            receipt_email: request.payload.stripeEmail
        }

        if (request.payload.description) {
            options.description = request.payload.description
        }
        stripe.charges.create(options, function (err) {
            if (err) return reply.redirect(config.errorRedirectUri)
            return reply.redirect(config.successRedirectUri)
        })
    },
    method: 'POST',
    path: PATHNAME,
})
