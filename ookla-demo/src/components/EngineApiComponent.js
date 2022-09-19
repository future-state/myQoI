import React, {Component} from 'react';
import {Jumbotron, Button, Input} from 'reactstrap';
import {STATIC_SERVER_LIST} from '../constants.js';
import {SUPPLEMENTAL_DATA} from '../constants.js';

class EngineApiComponent extends Component {
  render() {
    return (
      <Jumbotron>
        <div className="row">
          <div className="col-6">
            <div><strong>JS Engine APIs:</strong></div>
            <hr/>
            <div className="row">
                <Button color="link" onClick={ () => console.log(this.props.engine.getEngineVersion()) }>Get Engine Version</Button>
            </div>
            <hr/>
            <div className="row">
              <textarea id="configInput" rows="4" cols="50" defaultValue='{ "engine": "js", "automaticStageProgression": true, "jsEngine": { "savePath": "/report", "saveType": "sdk" }, "saveResults": false, "apiKey": "abcdefghijklmnopqrstuvwxyz0123456789", "sdkBaseUrl": "https://www.example.com" }'>
              </textarea>
              <Button color="link" onClick={ () => { this.props.engine.configure(JSON.parse(document.getElementById('configInput').value)); console.log('Configuration complete.'); } }>Configure</Button>
            </div>
            <hr/>
            <div className="row">
              <div className="m-3"><Input id="searchInput" type="textbox"></Input></div><div className="m-3 mr-auto">
                <Button color="link" onClick={ () => this.props.engine.searchServers({search: document.getElementById('searchInput').value}).then((servers) => console.log(JSON.stringify(servers))) }>Search Servers</Button>
              </div>
            </div>
            <hr/>
            <div className="row">
              <div className="col-12">
                <div>Server Selection:</div>
                <div className="m-3"><Button color="info" onClick={ () => { this.props.engine.sortServers(); } }>Automatic (closest servers)</Button></div>
                <div className="m-3"><Button color="info" onClick={ () => { this.props.engine.serverUnderTest = STATIC_SERVER_LIST[0]; console.log(`serverUnderTest = ${JSON.stringify(STATIC_SERVER_LIST[0])}`) } }>Manual (static server list)</Button></div>
              </div>
            </div>
            <hr/>
            <div className="row">
              <div className="col">
                <div className="row">
                  <div className="m-3"><Button className="bg-success" onClick={ () => this.props.engine.startTest(this.props.engine.serverUnderTest) }>Start Test</Button></div>
                  <div className="m-3"><Button className="bg-danger" onClick={ () => this.props.engine.stopTest() }>Stop Test</Button></div>
                </div>
                <hr/>
                <div className="row">
                  <div className="m-3"><Button className="text-dark bg-warning" onClick={ () => { this.props.engine.nextStage('latency'); } }>Latency</Button></div>
                  <div className="m-3"><Button className="text-dark bg-warning" onClick={ () => { this.props.engine.nextStage('download'); } }>Download</Button></div>
                  <div className="m-3"><Button className="text-dark bg-warning" onClick={ () => { this.props.engine.nextStage('upload'); } }>Upload</Button></div>
                </div>
                <hr/>
                <div className="row">
                  <div className="m-3"><Button className="bg-primary" onClick={ () => { this.props.engine.setSupplementalSaveData(null); this.props.engine.nextStage('save'); } }>Save</Button></div>
                  <div className="m-3"><Button className="bg-primary" onClick={ () => { this.props.engine.setSupplementalSaveData(SUPPLEMENTAL_DATA); this.props.engine.nextStage('save'); } }>Save (with supplemental data)</Button></div>
                </div>
                <hr/>
                <div className="row">
                  <div className="m-3"><Input id="guid" type="textbox"></Input></div><div className="m-3 mr-auto">
                    <Button color="link" onClick={ () => this.props.engine.lookupSpeedtestResult(document.getElementById('guid').value).then(result => console.log(JSON.stringify(result))) }>Get Result by GUID</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Jumbotron>
    )
  }
}

export default EngineApiComponent;