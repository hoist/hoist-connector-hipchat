import config from 'config';
import HipChatConnector from '../../src/connector';
import {
  expect
}
from 'chai';
describe('messages api', () => {
  let connector;
  before(() => {
    connector = new HipChatConnector({
      scopes: "send_message,view_messages,send_notification"
    })

  });

  describe('get all messages', function () {
    this.timeout(5000);
    let result;
    let data = {};
    let authorization = {
      get: (key) => {
        return data[key];
      },
      set: (key, value) => {
        return Promise.resolve()
          .then(() => {
            data[key] = value;
          });
      },
      setDisplayProperty: () => {}

    }
    before(() => {
      data.clientSecret = config.get('clientSecret');
      data.clientId = config.get('clientId');
      data.AccessToken = config.get('AccessToken');
      data.ExpiresAt = config.get('ExpiresAt');
      connector.authorize(authorization);
      return connector.get('/room/test/history').then((r) => {
        result = r;
      });
    });
    it('returns list of rooms', () => {
      return expect(result.items[0].message).to.eql("hoist hi");
    });
  });
  describe('send a notification', function () {
    this.timeout(5000);
    let result;
    let data = {};
    let authorization = {
      get: (key) => {
        return data[key];
      },
      set: (key, value) => {
        return Promise.resolve()
          .then(() => {
            data[key] = value;
          });
      },
      setDisplayProperty: () => {}

    }
    before(() => {
      data.clientSecret = config.get('clientSecret');
      data.clientId = config.get('clientId');
      data.AccessToken = config.get('AccessToken');
      data.ExpiresAt = config.get('ExpiresAt');
      connector.authorize(authorization);
      return (result = connector.post('/room/test/notification', {
        message: 'hi from unit tests'
      }));
    });
    it('returns list of rooms', () => {
      return expect(result).to.be.fulfilled;
    });
  });
});
