import React, {Component} from 'react';
import HeaderComponent from './components/HeaderComponent';
import EngineApiComponent from './components/EngineApiComponent';
import {EngineApi} from '@ookla/speedtest-js-sdk';
import {Router, Route} from 'react-router';
import 'source-map-support/register';
import logo from './logo.svg';
import './App.css';
import config from './config.js';

class App extends Component {
  constructor(props) {
    super(props);
    EngineApi.configure(config);
    EngineApi.onServersSorted.add((servers) => {
      if (!servers.serverList) {
        EngineApi.serverUnderTest = servers[0];
        console.log(`serverUnderTest is ${JSON.stringify(EngineApi.serverUnderTest)}`);
      }
      if (servers.serverList) {
        let serverListString = [...servers.serverList].map(server => JSON.stringify(server));
        console.log(`onServersSorted: servers.serverList = ${serverListString}`);
        if (servers.serverList[0]) {
          EngineApi.serverUnderTest = servers.serverList[0];
          console.log(`serverUnderTest is ${JSON.stringify(EngineApi.serverUnderTest)}`);
        }
      }
      if (servers.serverSelectionDetails) {
        let serverSelectionDetailsString = [...servers.serverSelectionDetails].map(server => JSON.stringify(server));
        console.log(`onServersSorted: servers.serverSelectionDetailsString = ${serverSelectionDetailsString}`);
      }
    });
    EngineApi.onStarted.add(() => {
      console.log('onStarted');
    });
    EngineApi.onCanceled.add(() => {
      console.log('onCanceled');
    });
    EngineApi.onProgress.add((stageName, result) => {
      console.log(`${stageName} ${Math.floor(result.speed)} Bps (${Math.floor(result.ratioComplete * 100)}%)`);
    });
    EngineApi.onStageFinished.add((stageName, result) => {
      console.log(`onStageFinished(stageName = ${stageName}, result = ${JSON.stringify(result)})`);
    });
    EngineApi.onError.add((errorKey, errorMessage, errorObject) => {
      console.log(`onError: errorKey = ${errorKey}, errorMessage = ${errorMessage}, errorObject = ${JSON.stringify(errorObject)}`);
    });
    EngineApi.onResultSaved.add((saveResult, testResult) => {
      console.log(`onResultSaved saveResult = ${JSON.stringify(saveResult)} testResult = ${JSON.stringify(testResult)}`);
    });
    EngineApi.onFinished.add(() => {
      console.log('onFinished');
    });
  }
  render() {
    return (
      <React.Fragment>
        <HeaderComponent/>
        <EngineApiComponent engine={EngineApi}/>
      </React.Fragment>
    );
  }
}

export default App;
