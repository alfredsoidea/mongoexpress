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
          runTransaction,
          serverTimestamp
} from "firebase/firestore";

const storage = getStorage();
const dbstore = getFirestore();
const app = express();


const functionjs = {
  sayHello: function() {
    return 'Hello!';
  },
  get_userline_data: async function (thisforcompany, userId) {
    const docRef = await doc(dbstore, "userline_"+thisforcompany, userId)
    const docSnap = await getDoc(docRef);
    let thisuserdata = await docSnap.data()
    return thisuserdata
  },
  create_larkchat: async function (thisforcompany, displayName, imagekey, thisstoken) {
    let thisdata = []
    let getUserinitAdmin = await axios.get("https://larkapi.soidea.co/getuserinit/"+thisforcompany.name)
    console.log("getUserinitAdmin")
    await getUserinitAdmin.data.forEach((element) => {
      thisdata.push(element.userlark_id)
    });
    conole.log("thisdata")
    conole.log(thisdata)
    let response = await axios.post('https://open.larksuite.com/open-apis/im/v1/chats?user_id_type=user_id', {
      "name": displayName,
      "avatar": imagekey,
      "bot_id_list": [ thisforcompany.lark_app_api ],
      "user_id_list": thisdata
    }, {
      headers: {
        'Authorization': 'Bearer ' + thisstoken,
        'Content-Type': 'application/json; charset=utf-8"' 
      }
    })
    console.log(response)
    return response.data.data.chat_id;
  },
  upload_avatar_lark: async function (imagefileurl, thisstoken) {
    console.log("dataresult_avatar1")
    let dataresult_avatar = await axios({ 
      method: 'get', 
      responseType: 'arraybuffer',
      url: imagefileurl
    })
    console.log("dataresult_avatar")
    let response = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
      "image_type": "avatar",
      "image": dataresult_avatar.data
    }, {
      headers: {
        'Authorization': 'Bearer '+thisstoken,
        'Content-Type': 'multipart/form-data' 
      }
    })
    console.log("responselark")
    return response
  },
  check_messagestatus: async function(thisforcompany, userId) {
  },
  create_userline: async function(thisforcompany, userId, thisstoken) {
    console.log("functionjscreate_userline")
    let lark_app_api = thisforcompany.lark_app_api
    let lark_app_secret = thisforcompany.lark_app_secret
    let linetoken = thisforcompany.linetoken
    let userfromline = await functionjs.get_user_from_line(userId, linetoken)
    let userDisplayname = userfromline.displayName
    const userDocRef = doc(dbstore, "userline_"+thisforcompany.name, userId);
    await runTransaction(dbstore, async (transaction) => {
      transaction.update(userDocRef, { 
        displayname: userDisplayname,
        pictureurl: userfromline.pictureUrl
      });
    });

    let avatarData = await functionjs.upload_avatar_lark(userfromline.pictureUrl , thisstoken)
    let avatarKey = avatarData.data.data.image_key
    let newlarkchatid = await functionjs.create_larkchat(thisforcompany, userDisplayname , avatarKey, thisstoken)
    let newUserdata = await runTransaction(dbstore, async (transaction) => {
      transaction.update(userDocRef, { 
        larkchatid: newlarkchatid
      })
    })
    await functionjs.query_message_by_user(thisstoken, thisforcompany , userId)
    return newlarkchatid
  },
  get_user_from_line: async function (userId, linetoken) {
    console.log("geting linedata from " + userId)
    let response = await axios.request({
      headers: {
        Authorization: `Bearer ${linetoken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      method: "GET",
      url: 'https://api.line.me/v2/bot/profile/' + userId
    })
    let linedata = response.data
    return linedata
  },
  getForcompany: async function (thisparam) {
    const docRef = await doc(dbstore, "company", thisparam);
    const docSnap = await getDoc(docRef);
    let thisdata = await docSnap.data()
    return thisdata
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
  send_message_by_userid: async function (thisstoken, thisforcompany, userId, datamessage) {
    //console.log("await userdata.data() start")
    let linetoken = thisforcompany.linetoken
    let thismessagetype = datamessage.message_data.message.type
    let datamessagekey = datamessage.id
    let contentdata = datamessage.message_data
    let datareturn = ""
    let userdataref = doc(dbstore, "userline_"+thisforcompany.name, userId);
    let userdataget = await getDoc(userdataref);
    let userdata = userdataget.data()
    console.log(userdata)

    await functionjs.set_message_status(datamessagekey, thisforcompany, 'process')

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
        functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
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
        functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      case 'audio':
        let dataresultaudio = await axios({ 
          method: 'get', 
          responseType: 'arraybuffer',
          url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
          headers: { 
            'Authorization': 'Bearer '+linetoken
          }
        })

        let fileDataaudio = dataresultaudio.data

        let dataresultsentaudio = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
          "file_type": "opus",
          "duration": contentdata.message.duration,
          "file": fileDataaudio
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'multipart/form-data' 
          }
        })
        console.log("dataresultsentaudio")
        console.log(dataresultsentaudio)
        //sending audio message
        datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
          "receive_id": userdata.larkchatid,
          "content": JSON.stringify({
            "file_key": dataresultsentaudio.data.data.file_key
          }),
          "msg_type": "audio"
        }, {
          headers: {
            'Authorization': 'Bearer '+thisstoken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        })

        functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
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
          "duration": contentdata.message.duration,
          "file_name": "video_"+functionjs.makeid(20)+".mp4",
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

        functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
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
        functionjs.set_message_status(datamessagekey, thisforcompany, 'sent')
        break;
      default:
    }
  
  },
  // send_message_by_webhook: async function (thisstoken, thisforcompany, datamessage) {
  //   console.log(thisforcompany.name)
  //   let linetoken = thisforcompany.linetoken
  //   let thismessagetype = datamessage.message_data.type
  //   let datamessagekey = datamessage.id
  //   let contentdata = datamessage.message_data
  //   let datareturn = ""
  //   let userdata = await axios({
  //       url: 'https://larkapi.soidea.co/checkuserline-old/'+thisforcompany.name+'/'+datamessage.user_id,
  //       method: 'get',
  //       timeout: 15000,
  //       headers: {'Content-Type': 'application/json',}
  //   })
  //   console.log(contentdata)
  //   if (datamessage.status == 'wait') {
  //     switch(thismessagetype) {
  //       case 'text':
  //         let datasendtext = contentdata.message.text
  //         datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
  //           "receive_id": userdata.larkchatid,
  //           "msg_type": "text",
  //           "content": JSON.stringify({ "text": datasendtext })
  //         }, {
  //           headers: {
  //             'Authorization': 'Bearer '+thisstoken,
  //             'Content-Type': 'application/json',
  //             'Accept': 'application/json'
  //           }
  //         })
  //         functionjs.set_message_status(datamessagekey, forcompany, 'sent')
  //         break;
  //       case 'sticker':
  //         datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
  //           "receive_id": userdata.larkchatid,
  //           "msg_type": "text",
  //           "content": JSON.stringify({ "text": "[ sticker ]" })
  //         }, {
  //           headers: {
  //             'Authorization': 'Bearer '+thisstoken,
  //             'Content-Type': 'application/json',
  //             'Accept': 'application/json'
  //           }
  //         })
  //         functionjs.set_message_status(datamessagekey, forcompany, 'sent')
  //         break;
  //       case 'video':
  //         console.log('video')
  //         let dataresultvideo = await axios({ 
  //           method: 'get', 
  //           responseType: 'arraybuffer',
  //           url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
  //           headers: { 
  //             'Authorization': 'Bearer '+linetoken
  //           }
  //         })

  //         let fileData = dataresultvideo.data

  //         let dataresultsentvideo = await axios.post('https://open.larksuite.com/open-apis/im/v1/files', {
  //           "file_type": "mp4",
  //           "file_name": "video_"+functionjs.makeid(20)+".mp4",
  //           "duration": contentdata.message.duration,
  //           "file": fileData
  //         }, {
  //           headers: {
  //             'Authorization': 'Bearer '+thisstoken,
  //             'Content-Type': 'multipart/form-data' 
  //           }
  //         })

  //         let dataresultvideo_preview = await axios({ 
  //           method: 'get', 
  //           responseType: 'arraybuffer',
  //           url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content/preview',
  //           headers: {  'Authorization': 'Bearer '+linetoken }
  //         })

  //         console.log("dataresultvideo_preview")

  //         let videoPrev = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
  //           "image_type": "message",
  //           "image": dataresultvideo_preview.data
  //         }, {
  //           headers: {
  //             'Authorization': 'Bearer '+thisstoken,
  //             'Content-Type': 'multipart/form-data' 
  //           }
  //         })

  //         //sending video message
  //         datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
  //           "receive_id": userdata.larkchatid,
  //           "msg_type": "media",
  //           "content": JSON.stringify({
  //             "image_key": videoPrev.data.data.image_key,
  //             "file_key": dataresultsentvideo.data.data.file_key,
  //           })
  //         }, {
  //           headers: {
  //             'Authorization': 'Bearer '+thisstoken,
  //             'Content-Type': 'application/json',
  //             'Accept': 'application/json'
  //           }
  //         })

  //         functionjs.set_message_status(datamessagekey, forcompany, 'sent')
  //         break;
  //       case 'image':
  //         var dataresult = await axios({ 
  //           method: 'get', 
  //           responseType: 'arraybuffer',
  //           url: 'https://api-data.line.me/v2/bot/message/'+contentdata.message.id+'/content',
  //           headers: { 
  //             'Authorization': 'Bearer '+linetoken
  //           }
  //         })
  //         var dataresultsent = await axios.post('https://open.larksuite.com/open-apis/im/v1/images', {
  //           "image_type": "message",
  //           "image": dataresult.data
  //         }, {
  //           headers: {
  //             'Authorization': 'Bearer '+thisstoken,
  //             'Content-Type': 'multipart/form-data' 
  //           }
  //         })
  //         datareturn = await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
  //           "receive_id": userdata.larkchatid,
  //           "msg_type": "image",
  //           "content": JSON.stringify({
  //             "image_key": dataresultsent.data.data.image_key
  //           })
  //         }, {
  //           headers: {
  //             'Authorization': 'Bearer '+thisstoken,
  //             'Content-Type': 'application/json',
  //             'Accept': 'application/json'
  //           }
  //         })
  //         functionjs.set_message_status(datamessagekey, forcompany, 'sent')
  //         break;
  //       default:
  //     }
  //   }
  // },
  set_message_status: async function (datamessagekey, thisforcompany, statuschange) {
    let dataref = await collection(dbstore, "message_line_"+thisforcompany.name)
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
  query_message_by_user: async function (thisstoken, thisforcompany, userId) {
    let dataref = collection(dbstore, "message_line_"+thisforcompany.name)
    const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userId));
    const querySnapshot = await getDocs(q);
    //let messagejson = [];
    //console.log(thisforcompany)
    await querySnapshot.forEach(async (doc) => {
      let bodydata = doc.data()
      bodydata.id = doc.id
      console.log(bodydata)
      await functionjs.send_message_by_userid(thisstoken, thisforcompany, userId, bodydata)
      //messagejson.push(bodydata)
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
  },
  file_get_contents: async function(uri) {
      let res = await axios.get(uri, { responseType:"blob" })
      return res
  }
};

export default functionjs;