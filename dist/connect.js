'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = connect;

var _react = require('react');

var _lodash = require('lodash.isobject');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.isequal');

var _lodash4 = _interopRequireDefault(_lodash3);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _reactRedux = require('react-redux');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var defaultMapSocketToProps = function defaultMapSocketToProps() {
  return {};
};

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

// Helps track hot reloading.
var nextVersion = 0;

function connect() {
  var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var mapSocketToProps = opts.mapSocketToProps;


  mapSocketToProps = mapSocketToProps || defaultMapSocketToProps;

  // Helps track hot reloading.
  var version = nextVersion++;

  return function wrapWithChannelComponent(WrappedComponent) {
    var channelConnectDisplayName = 'ChannelConnect(' + getDisplayName(WrappedComponent) + ')';

    var ChannelConnect = function (_Component) {
      _inherits(ChannelConnect, _Component);

      function ChannelConnect(props, context) {
        _classCallCheck(this, ChannelConnect);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(ChannelConnect).call(this, props, context));

        _this.version = version;
        _this.store = props.store || context.store;
        _this.socket = props.socket || context.socket;

        (0, _invariant2.default)(!!_this.socket, 'Could not find "socket" in either the context or ' + ('props of "' + channelConnectDisplayName + '". ') + 'Either wrap the root component in a <Provider>, ' + ('or explicitly pass "socket" as a prop to "' + channelConnectDisplayName + '".'));

        _this.channels = {};
        return _this;
      }

      _createClass(ChannelConnect, [{
        key: 'componentWillMount',
        value: function componentWillMount() {
          var props = this.props;

          this.connectToAllChannels(props);
          this.bindStoreUpdates();
        }
      }, {
        key: 'componentWillReceiveProps',
        value: function componentWillReceiveProps(nextProps) {
          // we got new props, we need to unsubscribe and re-watch all handles
          // with the new data
          if (!(0, _lodash4.default)(this.props, nextProps)) {
            this.haveOwnPropsChanged = true;
            this.connectToAllChannels(nextProps);
          }
        }
      }, {
        key: 'shouldComponentUpdate',
        value: function shouldComponentUpdate(nextProps, _nextState) {
          return this.haveOwnPropsChanged || this.hasOwnStateChanged;
        }
      }, {
        key: 'componentWillUnmount',
        value: function componentWillUnmount() {
          this.disconnectAllChannels();

          if (this.unsubscribeFromStore) {
            this.unsubscribeFromStore();
            this.unsubscribeFromStore = null;
          }
        }
      }, {
        key: 'bindStoreUpdates',
        value: function bindStoreUpdates() {
          var _this2 = this;

          var store = this.store;


          this.unsubscribeFromStore = store.subscribe(function () {
            var props = _this2.props;

            var newState = (0, _objectAssign2.default)({}, store.getState());
            var oldState = (0, _objectAssign2.default)({}, _this2.previousState);

            if (!(0, _lodash4.default)(oldState, newState)) {
              _this2.previousState = newState;
              _this2.hasOwnStateChanged = true;

              _this2.connectToAllChannels(props);
            }
          });
        }
      }, {
        key: 'connectToAllChannels',
        value: function connectToAllChannels(props) {
          var socket = this.socket;
          var store = this.store;


          var channelHandles = mapSocketToProps({
            socket: socket,
            ownProps: props,
            state: store.getState()
          });

          var oldChannels = (0, _objectAssign2.default)({}, this.previousChannels);
          this.previousChannels = (0, _objectAssign2.default)({}, channelHandles);

          // don't re run channels if nothing has changed
          if ((0, _lodash4.default)(oldChannels, channelHandles)) {
            return;
          } else if (oldChannels) {
            // unsubscribe from previous channels
            this.disconnectAllChannels();
          }

          if ((0, _lodash2.default)(channelHandles) && Object.keys(channelHandles).length) {
            this.channelHandles = channelHandles;
          }
        }
      }, {
        key: 'disconnectAllChannels',
        value: function disconnectAllChannels() {
          if (this.channelHandles) {
            for (var key in this.channelHandles) {
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
      }, {
        key: 'render',
        value: function render() {
          var haveOwnPropsChanged = this.haveOwnPropsChanged;
          var hasOwnStateChanged = this.hasOwnStateChanged;
          var renderedElement = this.renderedElement;
          var props = this.props;


          this.haveOwnPropsChanged = false;
          this.hasOwnStateChanged = false;

          var channelsProps = this.channelHandles;

          var mergedPropsAndChannels = (0, _objectAssign2.default)({}, props, channelsProps);

          if (!haveOwnPropsChanged && !hasOwnStateChanged && renderedElement) {
            return renderedElement;
          }

          this.renderedElement = (0, _react.createElement)(WrappedComponent, mergedPropsAndChannels);
          return this.renderedElement;
        }
      }]);

      return ChannelConnect;
    }(_react.Component);

    ChannelConnect.displayName = channelConnectDisplayName;
    ChannelConnect.WrappedComponent = WrappedComponent;
    ChannelConnect.contextTypes = {
      store: _react.PropTypes.object.isRequired,
      socket: _react.PropTypes.object.isRequired
    };
    ChannelConnect.propTypes = {
      store: _react.PropTypes.object,
      socket: _react.PropTypes.object
    };

    // apply react-redux args from original args
    var mapStateToProps = opts.mapStateToProps;
    var mapDispatchToProps = opts.mapDispatchToProps;
    var mergeProps = opts.mergeProps;
    var options = opts.options;

    return (0, _reactRedux.connect)(mapStateToProps, mapDispatchToProps, mergeProps, options)(ChannelConnect);
  };
}