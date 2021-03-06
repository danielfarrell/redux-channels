/* global describe it */
import expect from 'expect';
import React, { createClass, Children, PropTypes, Component } from 'react';
import TestUtils from 'react-addons-test-utils';
import { createStore } from 'redux';
import { createSocket } from '../utils';
import { connect } from '../../src/index';

describe('React', () => {
  describe('connect', () => {
    class Passthrough extends Component {
      render() {
        return <div {...this.props} />;
      }
    }

    class ProviderMock extends Component {
      getChildContext() {
        return {
          store: this.props.store,
          socket: this.props.socket
        };
      }

      render() {
        return Children.only(this.props.children);
      }
    }

    ProviderMock.childContextTypes = {
      store: PropTypes.object,
      socket: PropTypes.object
    };

    function stringBuilder(prev = '', action) {
      return action.type === 'APPEND'
        ? prev + action.body
        : prev;
    }

    it('should pass store through in the context', () => {
      const store = createStore(() => ({}));
      const socket = createSocket();

      class Container extends Component {
        render() {
          return <Passthrough {...this.props} />;
        }
      }
      Container = connect()(Container);

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} socket={socket}>
          <Container pass="through" />
        </ProviderMock>
      );

      const container = TestUtils.findRenderedComponentWithType(tree, Container);
      expect(container.context.store).toBe(store);
    });

    it('should pass state and props to the given component', () => {
      const store = createStore(() => ({
        foo: 'bar',
        baz: 42,
        hello: 'world'
      }));
      const socket = createSocket();

      class Container extends Component {
        render() {
          return <Passthrough {...this.props} />;
        }
      }
      Container = connect({ mapStateToProps: ({ foo, baz }) => ({ foo, baz }) })(Container);

      const container = TestUtils.renderIntoDocument(
        <ProviderMock store={store} socket={socket}>
          <Container pass="through" baz={50} />
        </ProviderMock>
      );
      const stub = TestUtils.findRenderedComponentWithType(container, Passthrough);
      expect(stub.props.pass).toEqual('through');
      expect(stub.props.foo).toEqual('bar');
      expect(stub.props.baz).toEqual(42);
      expect(stub.props.hello).toEqual(undefined);
      expect(() =>
        TestUtils.findRenderedComponentWithType(container, Container)
      ).toNotThrow();
    });

    it('should handle dispatches before componentDidMount', () => {
      const store = createStore(stringBuilder);
      const socket = createSocket();

      class Container extends Component {
        componentWillMount() {
          store.dispatch({ type: 'APPEND', body: 'a' });
        }

        render() {
          return <Passthrough {...this.props} />;
        }
      }
      Container = connect({ mapStateToProps: state => ({ string: state }) })(Container);

      const tree = TestUtils.renderIntoDocument(
        <ProviderMock store={store} socket={socket}>
          <Container />
        </ProviderMock>
      );

      const stub = TestUtils.findRenderedComponentWithType(tree, Passthrough);
      expect(stub.props.string).toBe('a');
    });

    it('should handle additional prop changes in addition to slice', () => {
      const store = createStore(() => ({
        foo: 'bar'
      }));
      const socket = createSocket();

      class ConnectContainer extends Component {
        render() {
          return (
            <Passthrough {...this.props} pass={this.props.bar.baz} />
          );
        }
      }
      ConnectContainer = connect({ mapStateToProps: state => state })(ConnectContainer);

      class Container extends Component {
        constructor() {
          super();
          this.state = {
            bar: {
              baz: ''
            }
          };
        }

        componentDidMount() {
          this.setState({
            bar: Object.assign({}, this.state.bar, { baz: 'through' })
          });
        }

        render() {
          return (
            <ProviderMock store={store} socket={socket}>
              <ConnectContainer bar={this.state.bar} />
             </ProviderMock>
          );
        }
      }

      const container = TestUtils.renderIntoDocument(<Container />);
      const stub = TestUtils.findRenderedComponentWithType(container, Passthrough);
      expect(stub.props.foo).toEqual('bar');
      expect(stub.props.pass).toEqual('through');
    });

    it('should merge actionProps into WrappedComponent', () => {
      const store = createStore(() => ({
        foo: 'bar'
      }));
      const socket = createSocket();

      class Container extends Component {
        render() {
          return <Passthrough {...this.props} />;
        }
      }
      Container = connect({
        mapStateToProps: state => state,
        mapDispatchToProps: dispatch => ({ dispatch })
      })(Container);

      const container = TestUtils.renderIntoDocument(
        <ProviderMock store={store} socket={socket}>
          <Container pass="through" />
        </ProviderMock>
      );
      const stub = TestUtils.findRenderedComponentWithType(container, Passthrough);
      expect(stub.props.dispatch).toEqual(store.dispatch);
      expect(stub.props.foo).toEqual('bar');
      expect(() =>
        TestUtils.findRenderedComponentWithType(container, Container)
      ).toNotThrow();
      const decorated = TestUtils.findRenderedComponentWithType(container, Container);
      expect(decorated.isSubscribed()).toBe(true);
    });

    it('should recalculate the state and rebind the actions on hot update', () => {
      const store = createStore(() => {});
      const socket = createSocket();

      class ContainerBefore extends Component {
        render() {
          return (
            <Passthrough {...this.props} />
          );
        }
      }
      ContainerBefore = connect({
        mapDispatchToProps: () => ({ scooby: 'doo' })
      })(ContainerBefore);

      class ContainerAfter extends Component {
        render() {
          return (
            <Passthrough {...this.props} />
          );
        }
      }
      ContainerAfter = connect({
        mapStateToProps: () => ({ foo: 'baz' }),
        mapDispatchToProps: () => ({ scooby: 'foo' })
      })(ContainerAfter);

      class ContainerNext extends Component {
        render() {
          return (
            <Passthrough {...this.props} />
          );
        }
      }
      ContainerNext = connect({
        mapStateToProps: () => ({ foo: 'bar' }),
        mapDispatchToProps: () => ({ scooby: 'boo' })
      })(ContainerNext);

      let container;
      TestUtils.renderIntoDocument(
        <ProviderMock store={store} socket={socket}>
          <ContainerBefore ref={instance => container = instance} />
        </ProviderMock>
      );
      const stub = TestUtils.findRenderedComponentWithType(container, Passthrough);
      expect(stub.props.foo).toEqual(undefined);
      expect(stub.props.scooby).toEqual('doo');

      function imitateHotReloading(TargetClass, SourceClass) {
        // Crude imitation of hot reloading that does the job
        Object.getOwnPropertyNames(SourceClass.prototype).filter(key =>
          typeof SourceClass.prototype[key] === 'function'
        ).forEach(key => {
          if (key !== 'render' && key !== 'constructor') {
            TargetClass.prototype[key] = SourceClass.prototype[key];
          }
        });

        container.forceUpdate();
      }

      imitateHotReloading(ContainerBefore, ContainerAfter);
      expect(stub.props.foo).toEqual('baz');
      expect(stub.props.scooby).toEqual('foo');

      imitateHotReloading(ContainerBefore, ContainerNext);
      expect(stub.props.foo).toEqual('bar');
      expect(stub.props.scooby).toEqual('boo');
    });

    it('should set the displayName correctly', () => {
      expect(connect(state => state)(
        class Foo extends Component {
          render() {
            return <div />;
          }
        }
      ).displayName).toBe('Connect(ChannelConnect(Foo))');

      expect(connect(state => state)(
        createClass({
          displayName: 'Bar',
          render() {
            return <div />;
          }
        })
      ).displayName).toBe('Connect(ChannelConnect(Bar))');

      expect(connect(state => state)(
        createClass({
          render() {
            return <div />;
          }
        })
      ).displayName).toBe('Connect(ChannelConnect(Component))');
    });

    it('should expose the wrapped component as WrappedComponent', () => {
      class Container extends Component {
        render() {
          return <Passthrough />;
        }
      }

      const decorator = connect(state => state);
      const decorated = decorator(Container);

      expect(decorated.WrappedComponent).toBe(Container);
    });

    it('should use the store from the props instead of from the context if present', () => {
      class Container extends Component {
        render() {
          return <Passthrough />;
        }
      }

      let actualState;

      const expectedState = { foos: {} };
      const decorator = connect({
        mapStateToProps: state => {
          actualState = state;
          return {};
        }
      });
      const Decorated = decorator(Container);
      const mockStore = {
        dispatch: () => {},
        subscribe: () => {},
        getState: () => expectedState
      };
      const socket = createSocket();

      TestUtils.renderIntoDocument(<Decorated store={mockStore} socket={socket} />);

      expect(actualState).toEqual(expectedState);
    });

    it('should throw an error if the store is not in the props or context', () => {
      class Container extends Component {
        render() {
          return <Passthrough />;
        }
      }

      const decorator = connect(() => {});
      const Decorated = decorator(Container);

      expect(() =>
        TestUtils.renderIntoDocument(<Decorated />)
      ).toThrow(
        /Could not find "store"/
      );
    });

    it('should use the socket from the props instead of from the context if present', () => {
      class Container extends Component {
        render() {
          return <Passthrough />;
        }
      }

      let actualSocket;

      const expectedSocket = { test: true };
      const decorator = connect({
        mapSocketToProps: ({ socket }) => {
          actualSocket = socket;
          return {};
        }
      });
      const Decorated = decorator(Container);
      const store = createStore(() => {});
      const mockSocket = { test: true };

      TestUtils.renderIntoDocument(<Decorated store={store} socket={mockSocket} />);

      expect(actualSocket).toEqual(expectedSocket);
    });

    it('should throw an error if the socket is not in the props or context', () => {
      class Container extends Component {
        render() {
          return <Passthrough />;
        }
      }
      const store = createStore(() => {});

      const decorator = connect(() => {});

      const Decorated = decorator(
        <Container pass="through" />
      );

      expect(() => {
        TestUtils.renderIntoDocument(
          <ProviderMock store={store}>
            <Decorated />
          </ProviderMock>
        );
      }).toThrow(
        /Could not find "socket"/
      );
    });

    it('should not call update if mergeProps return value has not changed', () => {
      let mapStateCalls = 0;
      let renderCalls = 0;
      const store = createStore(stringBuilder);
      const socket = createSocket();

      class Container extends Component {
        render() {
          renderCalls++;
          return <Passthrough {...this.props} />;
        }
      }
      Container = connect({
        mapStateToProps: () => ({ a: ++mapStateCalls }),
        mapDispatchToProps: null,
        mergeProps: () => ({ changed: false })
      })(Container);

      TestUtils.renderIntoDocument(
        <ProviderMock store={store} socket={socket}>
          <Container />
        </ProviderMock>
      );

      expect(renderCalls).toBe(1);
      expect(mapStateCalls).toBe(1);

      store.dispatch({ type: 'APPEND', body: 'a' });

      expect(mapStateCalls).toBe(2);
      expect(renderCalls).toBe(1);
    });
  });
});
