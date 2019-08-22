import React from 'react';
import {
  StyleSheet,
  Text,
  Button,
  View,
  PermissionsAndroid,
} from 'react-native';
import RNFB from 'react-native-fetch-blob';
import NetInfo from "@react-native-community/netinfo";
import Config from "react-native-config";

const OCR_API = 'https://api.ocr.space/parse/image';
const REQ_IMG_EXT = ['jpg', 'jpeg', 'png'];
const text = [
  "Click to process images in 'Download' directory!",
  "Processing...",
  "Success :)",
  "Failed :(",
  "Please enable internet!"
]

const App = () => {
  return <Component />
};

class Component extends React.Component{
  state = {
    disabled: true,
    ind: 0,
    hasInternet: false
  }

  componentDidMount(){
    this.checkStoragePermission();
    NetInfo.fetch().then(state => {
      this.setState({
        hasInternet: state.isConnected
      })
    });

    this.unsubscribe = NetInfo.addEventListener(state => {
      this.setState({
        hasInternet: state.isConnected
      })
    });
  }

  componentWillUnmount(){
    this.unsubscribe();
  }

  grantStoragePermission = () => {
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    ).then(granted => {
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        this.setState({
          disabled: false
        })
      } else {
        console.log("Permission Denied!");
      }
    }).catch(err => {
      console.log(err);
    })
  }

  checkStoragePermission = () => {
    PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    ).then(status => {
      if(status){
        this.setState({
          disabled: false
        })
      }else{
        this.grantStoragePermission();
      }
    }).catch(err => {
      console.log(err);
    })
  }

  handlePress = () => {
    this.setState({
      disabled: true,
      ind: 1
    })
    const dir = RNFB.fs.dirs.DownloadDir;
    const p1 = new Promise(resolve => {
      RNFB.fs.ls(dir).then(files => {
        let imgFiles = [];
        files.forEach(f => {
          const parts = f.split('.');
          const ext = parts.slice(-1)[0];
          if(REQ_IMG_EXT.includes(ext)){
            imgFiles.push(f);
          }
        })
        resolve(imgFiles);
      }).catch(err => {
        console.log('err1: ', err);
        this.setState({
          disabled: false,
          ind: 3
        })
      })
    })
    const p2 = new Promise(resolve => {
      p1.then(async files => {
        const textData = await files.map(async f => {
          const parts = f.split('.');
          const newName = `${dir}/${parts.slice(0, -1).join('.')}.txt`;
          const imgPath = `${dir}/${f}`;
          const file = await RNFB.fs.readFile(imgPath, 'base64');
          if(file){
            const base64Image = `data:image/jpeg;base64,${file}`;
            const formData = new FormData();            
            formData.append("base64Image", base64Image);
            formData.append("language"   , "eng");
            formData.append("apikey"  , Config.OCR_KEY);            
            const response = await fetch(OCR_API, {
              method: 'POST',
              headers: {
                apiKey: Config.OCR_KEY,
              },
              body: formData
            });
            if(response){
             const result = await response.json();
              if(result){                
                const imgText = result.ParsedResults[0].ParsedText;                
                const exists = await RNFB.fs.exists(newName);            
                if(exists){
                  return RNFB.fs.writeFile(newName, imgText, 'utf8');
                }else{
                  return RNFB.fs.createFile(newName, imgText, 'utf8');
                }
              }
            }
          }
        })
        resolve(textData)
      }).catch(err => {
        console.log('err2: ', err);
        this.setState({
          disabled: false,
          ind: 3
        })
      })
    })
    p2.then(res => {
      Promise.all(res).then(_ => {
        this.setState({
          disabled: false,
          ind: 2
        })
      })
    }).catch(err => {
      console.log('err3: ', err);
      this.setState({
        disabled: false,
        ind: 3
      })
    })
  }

  render(){
    const {disabled, ind, hasInternet} = this.state;
    return(
      <View style={styles.container}>
        <Text style={styles.text}>{!hasInternet ? text[4] : text[ind]}</Text>
        <Button title="Process" onPress={this.handlePress} disabled={!hasInternet ? true : disabled} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginBottom: 30
  }
});

export default App;
