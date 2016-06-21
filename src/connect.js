import { Component, createElement, PropTypes } from 'react';
import isObject from 'lodash.isobject';
import isEqual from 'lodash.isequal';
import invariant from 'invariant';
import assign from 'object-assign';
import { connect as ReactReduxConnect } from 'react-redux';

const defaultMapSocketToProps = () => ({});

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

// Helps track hot reloading.
let nextVersion = 0;

export default function connect(opts = {}) {
  let { mapSocketToProps } = opts;

  mapSocketToProps = mapSocketToProps || defaultMapSocketToProps;

  // Helps track hot reloading.
  const version = nextVersion++;

  return function wrapWithChannelComponent(WrappedComponent) {
    const channelConnectDisplayName = `ChannelConnect(${getDisplayName(WrappedComponent)})`;

    class ChannelConnect extends Component {
      constructor(props, context) {
        super(props, context);
        this.version = version;
        this.store = props.store || context.store;
        this.socket = props.socket || context.socket;

        invariant(!!this.socket,
          'Could not find "socket" in either the context or ' +
          `props of "${channelConnectDisplayName}". ` +
          'Either wrap the root component in a <Provider>, ' +
          `or explicitly pass "socket" as a prop to "${channelConnectDisplayName}".`
        );

        this.channels = {};
      }

      componentWillMount() {
        const { props } = this;
        this.connectToAllChannels(props);
        this.bindStoreUpdates();
      }

      componentWillReceiveProps(nextProps) {
        // we got new props, we need to unsubscribe and re-watch all handles
        // with the new data
        if (!isEqual(this.props, nextProps)) {
          this.haveOwnPropsChanged = true;
          this.connectToAllChannels(nextProps);
        }
      }

      shouldComponentUpdate(nextProps, _nextState) {
        return this.haveOwnPropsChanged ||
        this.hasOwnStateChanged;
      }

      componentWillUnmount() {
        this.disconnectAllChannels();

        if (this.unsubscribeFromStore) {
          this.unsubscribeFromStore();
          this.unsubscribeFromStore = null;
        }
      }

      bindStoreUpdates() {
        const { store } = this;

        this.unsubscribeFromStore = store.subscribe(() => {
          const { props } = this;
          const newState = assign({}, store.getState());
          const oldState = assign({}, this.previousState);

          if (!isEqual(oldState, newState)) {
            this.previousState = newState;
            this.hasOwnStateChanged = true;

            this.connectToAllChannels(props);
          }
        });
      }

      connectToAllChannels(props) {
        const { socket, store } = this;

        const channelHandles = mapSocketToProps({
          socket,
          ownProps: props,
          state: store.getState()
        });

        const oldChannels = assign({}, this.previousChannels);
        this.previousChannels = assign({}, channelHandles);

        // don't re run channels if nothing has changed
        if (isEqual(oldChannels, channelHandles)) {
          return;
        } else if (oldChannels) {
          // unsubscribe from previous channels
          this.disconnectAllChannels();
        }

        if (isObject(channelHandles) && Object.keys(channelHandles).length) {
          this.channelHandles = channelHandles;
        }
      }

      disconnectAllChannels() {
        if (this.channelHandles) {
          for (const key in this.channelHandles) {
            if (!this.channelHandles.hasOwnProperty(key)) {
              continue;
            }
            if (this.channelHandles[key].hasOwnProperty('leave')) {
              this.channelHandles[key].leave(); // Phoenix
            } else if (this.channelHandles[key].hasOwnProperty('unsubscribe')) {
              this.channelHandles[key].unsubscribe(); // Rails
            }
          }
        }
      }

      render() {
        const {
          haveOwnPropsChanged,
          hasOwnStateChanged,
          renderedElement,
          props
        } = this;

        this.haveOwnPropsChanged = false;
        this.hasOwnStateChanged = false;

        const channelsProps = this.channelHandles;

        const mergedPropsAndChannels = assign({}, props, channelsProps);

        if (
          !haveOwnPropsChanged &&
          !hasOwnStateChanged &&
          renderedElement
         ) {
          return renderedElement;
        }

        this.renderedElement = createElement(WrappedComponent, mergedPropsAndChannels);
        return this.renderedElement;
      }

    }

    ChannelConnect.displayName = channelConnectDisplayName;
    ChannelConnect.WrappedComponent = WrappedComponent;
    ChannelConnect.contextTypes = {
      store: PropTypes.object.isRequired,
      socket: PropTypes.object.isRequired
    };
    ChannelConnect.propTypes = {
      store: PropTypes.object,
      socket: PropTypes.object
    };

    // apply react-redux args from original args
    const { mapStateToProps, mapDispatchToProps, mergeProps, options } = opts;
    return ReactReduxConnect(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options
    )(ChannelConnect);
  };
}
