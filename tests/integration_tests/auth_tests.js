import HipChatConnector from '../../lib/connector';
import sinon from 'sinon';
import {
  expect
}
from 'chai';
import config from 'config';

describe('authorization steps', () => {
  let connector;
  let key = 'connectorkey';
  let configuration = {
    "description": "My Addon",
    "key": `io.hoist.${key}`,
    "name": "Integration Name",
    "vendor": {
      "name": "Company Name",
      "url": "http://hoist.io"
    },
    "links": {
      "self": `https://bouncer.hoist.test/info/${key}`
    },
    "capabilities": {
      "hipchatApiConsumer": {
        "scopes": [
          "send_notification",
          "send_message",
          "view_messages"
        ],
        "fromName": "Integration Name"
      },
      "installable": {
        "allowGlobal": true,
        "allowRoom": true,
        "callbackUrl": `https://bouncer.hoist.test/configure/${key}`,
        "installedUrl": "https://bouncer.hoist.test/bounce"
      },
      "webhook": [{
        "name": 'webhookname',
        "pattern": 'pattern',
        "event": "room_message",
        "url": `https://endpoint.hoist.test/connector/${key}`
      }]
    }
  };
  before(() => {
    connector = new HipChatConnector({
      description: configuration.description,
      name: configuration.name,
      vendorName: configuration.vendor.name,
      vendorUrl: configuration.vendor.url,
      scopes: configuration.capabilities.hipchatApiConsumer.scopes.join(','),
      webhookName: configuration.capabilities.webhook[0].name,
      webhookPattern: configuration.capabilities.webhook[0].pattern
    });
  });
  describe('on first bounce', () => {
    let bounce;
    before(() => {
      bounce = {
        get: function () {
          return undefined;
        },
        delete: function () {
          return Promise.resolve(null);
        },
        set: function () {
          console.log('set', arguments);
          return Promise.resolve(null);
        },
        redirect: function () {
          console.log('redirect', arguments);
          return Promise.resolve(null);
        },
        done: function () {
          console.log('done', arguments);
          return Promise.resolve(null);
        },
        key: key
      };
      sinon.spy(bounce, 'get');
      sinon.spy(bounce, 'set');
      sinon.spy(bounce, 'redirect');
      return connector.receiveBounce(bounce);
    });
    it('should redirect user to install addon', () => {
      return expect(bounce.redirect).to.have.been.calledWith(`https://www.hipchat.com/addons/install?url=data:application/json;base64,${new Buffer(JSON.stringify(configuration)).toString('base64')}`);
    });
  });
});
