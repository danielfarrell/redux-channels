# redux-channels

A provider and connect for getting websocket channels(ie, Socket.io/Phoenix/ActionCable) working with Redux.

This library was heavily inspired by and borrows code from [react-redux](https://github.com/reactjs/react-redux/) and [react-apollo](https://github.com/apollostack/react-apollo).

## Install

`npm install --save redux-channels`

## Usage

### Phoenix channels

Phoenix channels are my primary target with the library.

```
import React from 'react';
import { render } from 'react-dom';
import { Socket } from 'phoenix';
import { SocketProvider } from 'redux-channels';

import configureStore from './store/configureStore';
import App from './containers/App';

const store = configureStore();

render(
  <SocketProvider store={store} socket={socket}>
    <App />
  </SocketProvider>,
  chatDOM
);
```

```
import { connect } from 'redux-channels';

class App extends React.Component {
  static propTypes = {
    messages: PropTypes.object,
    actions: PropTypes.object,
    someChannel: PropTypes.object
  };

  constructor(props) {
    super(props);
    const { actions, someChannel } = props;
    this.someChannel = someChannel;
    // Setup all your channel listening here
  }
}

const mapStateToProps = (state) => ({
  messages: state.messages
});
const mapDispatchToProps = (dispatch) => ({
  action: bindActionCreators(action, dispatch)
});
const mapSocketToProps = ({ socket, state }) => ({
  someChannel: socket.channel('some', { username: state.auth })
});
export default connect({
  mapStateToProps,
  mapDispatchToProps,
  mapSocketToProps
})(App);
```

### socket.io

Use [namespaces](http://socket.io/docs/rooms-and-namespaces/) in socket.io to have different channels and follow the general pattern above.
