import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';
import cors from 'cors';

import { initializeApp } from "firebase/app";
const firebaseConfig = {
  apiKey: "AIzaSyBKU0BuRrLaVudLHwPjlMpVHkK5tW645Yo",
  authDomain: "alfred-line-webhook-api.firebaseapp.com",
  projectId: "alfred-line-webhook-api",
  storageBucket: "alfred-line-webhook-api.appspot.com",
  messagingSenderId: "586062678452",
  appId: "1:586062678452:web:5aa9ba7ae0ae18bd770ae1"
};
const firebaseapp = initializeApp(firebaseConfig);
//require('dotenv').config();

//import api from './api/index.js';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { 
          getDoc,
          onSnapshot,
          getDocs,
          where,
          orderBy,
          doc,
          query,
          updateDoc,
          setDoc,
          addDoc,
          increment,
          getFirestore,
          collection,
          runTransaction
} from "firebase/firestore";

const storage = getStorage();
const dbstore = getFirestore();
const app = express();


const functionjs = {
  sayHello: function() {
    return 'Hello!';
  },
  get_userline_data: async function (thisparam, userId) {
    await onSnapshot(doc(dbstore, "userline_"+thisparam, userId), (doc) => {
      console.log("Current data: ", doc.data());
      return doc.data()
    });
  },
  getForcompany: async function (thisparam) {
    const docRef = doc(dbstore, "company", thisparam);
    const docSnap = await getDoc(docRef);
    return docSnap.data()
  },
  getTokenlark: async function (thisforcompany) {
    let datares  = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
      'app_id': thisforcompany.lark_app_api,
      'app_secret': thisforcompany.lark_app_secret
    }, {
      headers: { 'Content-type': 'application/json; charset=utf-8' }
    })
    return datares.data.tenant_access_token;
  },
  send_message_by_userid: async function (thisstoken, forcompany, userdata, datamessage) {
    let linetoken = forcompany.linetoken
    let thismessagetype = datamessage.message_data.message.type
    let datamessagekey = datamessage.id
    let contentdata = datamessage.message_data
    let datareturn = ""
    if (datamessage.status == 'process') {
      switch(thismessagetype) {
        case 'text':
          let datasendtext = contentdata.message.text
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "text",
            "content": JSON.stringify({ "text": datasendtext })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        case 'sticker':
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "text",
            "content": JSON.stringify({ "text": "[ sticker ]" })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        case 'video':
          console.log('video')
          let dataresultvideo = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
            headers: { 
              'Authorization': 'Bearer '+linetoken
            }
          })

          let fileData = dataresultvideo.data

          let dataresultsentvideo = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
            "file_type": "mp4",
            "file_name": "video_"+functionjs.makeid(20)+".mp4",
            "duration": contentdata.message.duration,
            "file": fileData
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })

          let dataresultvideo_preview = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content/preview',
            headers: {  'Authorization': 'Bearer '+linetoken }
          })

          console.log("dataresultvideo_preview")

          let videoPrev = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
            "image_type": "message",
            "image": dataresultvideo_preview.data
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })

          //sending video message
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "media",
            "content": JSON.stringify({
              "image_key": videoPrev.data.data.image_key,
              "file_key": dataresultsentvideo.data.data.file_key,
            })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })

          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        case 'image':
          var dataresult = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
            headers: { 
              'Authorization': 'Bearer '+linetoken
            }
          })
          var dataresultsent = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
            "image_type": "message",
            "image": dataresult.data
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "image",
            "content": JSON.stringify({
              "image_key": dataresultsent.data.data.image_key
            })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        default:
      }
    }
  },
  send_message_by_webhook: async function (thisstoken, thisforcompany, datamessage) {
    console.log(thisforcompany.name)
    let linetoken = thisforcompany.linetoken
    let thismessagetype = datamessage.message_data.type
    let datamessagekey = datamessage.id
    let contentdata = datamessage.message_data
    let datareturn = ""
    let userdata = await axios({
        url: 'https://larkapi.soidea.co/checkuserline-old/'+thisforcompany.name+'/'+datamessage.user_id,
        method: 'get',
        timeout: 15000,
        headers: {'Content-Type': 'application/json',}
    })
    console.log(contentdata)
    if (datamessage.status == 'wait') {
      switch(thismessagetype) {
        case 'text':
          let datasendtext = contentdata.message.text
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "text",
            "content": JSON.stringify({ "text": datasendtext })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        case 'sticker':
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "text",
            "content": JSON.stringify({ "text": "[ sticker ]" })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        case 'video':
          console.log('video')
          let dataresultvideo = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
            headers: { 
              'Authorization': 'Bearer '+linetoken
            }
          })

          let fileData = dataresultvideo.data

          let dataresultsentvideo = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
            "file_type": "mp4",
            "file_name": "video_"+functionjs.makeid(20)+".mp4",
            "duration": contentdata.message.duration,
            "file": fileData
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })

          let dataresultvideo_preview = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content/preview',
            headers: {  'Authorization': 'Bearer '+linetoken }
          })

          console.log("dataresultvideo_preview")

          let videoPrev = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
            "image_type": "message",
            "image": dataresultvideo_preview.data
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })

          //sending video message
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "media",
            "content": JSON.stringify({
              "image_key": videoPrev.data.data.image_key,
              "file_key": dataresultsentvideo.data.data.file_key,
            })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })

          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        case 'image':
          var dataresult = await axios({ 
            method: 'get', 
            responseType: 'arraybuffer',
            url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
            headers: { 
              'Authorization': 'Bearer '+linetoken
            }
          })
          var dataresultsent = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
            "image_type": "message",
            "image": dataresult.data
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'multipart/form-data' 
            }
          })
          datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
            "receive_id": userdata.larkchatid,
            "msg_type": "image",
            "content": JSON.stringify({
              "image_key": dataresultsent.data.data.image_key
            })
          }, {
            headers: {
              'Authorization': 'Bearer '+thisstoken,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
          functionjs.set_message_status(datamessagekey, forcompany, 'sent')
          break;
        default:
      }
    }
  },
  set_message_status: async function (datamessagekey, forcompany, statuschange) {
    let dataref = await collection(dbstore, "message_line_"+forcompany)
    let datarefdoc = await doc(dataref, datamessagekey)
    try {
      await runTransaction(dbstore, async (transaction) => {
      const sfDoc = await transaction.get(datarefdoc);
        if (!sfDoc.exists()) {
          throw "Document does not exist!";
        }

        const newPopulation = statuschange;
        transaction.update(datarefdoc, { status: newPopulation });
      });
      console.log('Transaction success!');
    } catch (e) {
      console.log('Transaction failure:', e);
    }
  },
  query_message_by_user: async function (thisstoken, forcompany, userdata) {
    console.log("userdatatest")
    let userId = userdata.user_id
    let dataref = collection(dbstore, "message_line_"+forcompany)
    const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    let messagejson = [];
    await querySnapshot.forEach((doc) => {
      if (doc.data().status == 'wait') {
        let bodydata = doc.data()
        bodydata.id = doc.id
        bodydata.status = 'process'
        this.set_message_status(doc.id, forcompany, 'process')
        messagejson.push(bodydata)
      }
    });
    const jsonAsArray = await Object.keys(messagejson).map(function (key) {
      return messagejson[key];
    }).sort(function (itemA, itemB) {
      return itemA.init_timestamp < itemB.init_timestamp;
    });
    await jsonAsArray.forEach((doc) => {
      this.send_message_by_userid(thisstoken, forcompany, userdata, doc)
    });
    console.log("start query_message_by_user")
  },
  makeid: function(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
};

export default functionjs;