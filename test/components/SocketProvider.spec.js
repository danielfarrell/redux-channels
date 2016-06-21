/* global describe it */
import expect from 'expect';
import React, { PropTypes, Component } from 'react';
import TestUtils from 'react-addons-test-utils';
import { createStore } from 'redux';
import { SocketProvider } from '../../src/index';

describe('React', () => {
  describe('SocketProvider', () => {
    class Child extends Component {
      render() {
        return <div />;
      }
    }

    Child.contextTypes = {
      store: PropTypes.object.isRequired,
      socket: PropTypes.object.isRequired
    };

    it('should enforce a single child', () => {
      const store = createStore(() => ({}));
      const socket = {};

      // Ignore propTypes warnings
      const propTypes = SocketProvider.propTypes;
      SocketProvider.propTypes = {};

      try {
        expect(() => TestUtils.renderIntoDocument(
          <SocketProvider store={store} socket={socket}>
            <div />
          </SocketProvider>
        )).toNotThrow();

        expect(() => TestUtils.renderIntoDocument(
          <SocketProvider store={store} socket={socket} />
        )).toThrow(/exactly one child/);

        expect(() => TestUtils.renderIntoDocument(
          <SocketProvider store={store}>
            <div />
            <div />
          </SocketProvider>
        )).toThrow(/exactly one child/);
      } finally {
        SocketProvider.propTypes = propTypes;
      }
    });

    it('should add the store and socket to the child context', () => {
      const store = createStore(() => ({}));
      const socket = {};

      const spy = expect.spyOn(console, 'error');
      const tree = TestUtils.renderIntoDocument(
        <SocketProvider store={store} socket={socket}>
          <Child />
        </SocketProvider>
      );
      spy.destroy();
      expect(spy.calls.length).toBe(0);

      const child = TestUtils.findRenderedComponentWithType(tree, Child);
      expect(child.context.store).toBe(store);
      expect(child.context.socket).toBe(socket);
    });
  });
});
