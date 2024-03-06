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


function makeid(length) {
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

async function sendMessagetoLark (thisstoken,thismessagetype, forcompany, contentdata, userdata, linetoken) {
  console.log("start sendMessagetoLark")
  //console.log(thismessagetype)
  //console.log(userdata)
  console.log("contentdata")
  console.log(linetoken)
  //console.log(contentdata)
  switch(thismessagetype) {
    case 'text':
      let datasendtext = contentdata.message.text
      axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
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
      break;
    case 'sticker':
      axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
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
        "file_name": "video_"+makeid(20)+".mp4",
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
      await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
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
      await axios.post('https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id', {
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
      break;
    default:
  }
}



// Initialize Firebase
const firebaseapp = initializeApp(firebaseConfig);

//require('dotenv').config();

//import api from './api/index.js';

import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";

const storage = getStorage();

const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({message: 'test'});
});

app.post('/line/webhook/:forcompany', async (req, res) => {
  let thisparam = req.params.forcompany
  var getuserdata = "test";
  var requestbody = req.body
  console.log("req.body")
  console.log(JSON.stringify(req.body))
  var allmessage = requestbody['events']
  let countallmessage = 0;
  var thisstoken = "";
  var userId = allmessage[0]['source']['userId']
  console.log("checkuserline")
  let checkuserline = await axios.get('https://larkapi.soidea.co/checkuserline/'+thisparam+'/'+userId);
  let thisforcompany = await axios.get('https://larkapi.soidea.co/getforcompany/'+thisparam);
  let userdata = checkuserline.data
  thisstoken = await axios.post(
    'https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
      'app_id': thisforcompany.data.lark_app_api,
      'app_secret': thisforcompany.data.lark_app_secret
    }, {
      headers: { 'Content-type': 'application/json; charset=utf-8' }
    })
  thisstoken = thisstoken.data.tenant_access_token
  allmessage.forEach((currentElement, index) => {
    let thismessagetype = currentElement['message']['type']
    sendMessagetoLark(thisstoken, currentElement.message.type, thisforcompany, currentElement, userdata, thisforcompany.data.linetoken)
  })
  res.status(200).send('ok')
})

app.post('/upload_firebase', multer().single('file') , (req, res) => {
  let file = req.file.buffer
  console.log(req.file)
  console.log(req.body)
  const metadata = {
    contentType: req.file.mimetype
  };
  const storageRef = ref(storage, 'images/' + makeid(20) + "-" + req.file.originalname);
  const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  uploadTask.on('state_changed', (snapshot) => {
      console.log(snapshot)
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Upload is ' + progress + '% done');
      switch (snapshot.state) {
        case 'paused':
          console.log('Upload is paused');
          break;
        case 'running':
          console.log('Upload is running');
          break;
      }
    }, 
    (error) => {
      switch (error.code) {
        case 'storage/unauthorized':
          break;
        case 'storage/canceled':
          break;
        case 'storage/unknown':
          break;
      }
    }, () => {
      getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
        console.log(downloadURL);
      });
    }
  );
  res.json({
    message: 'done'
  });
});

function checklineuser (forcompany, userId) {

}

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Listening: http://localhost:${port}`);
});



export default  app;
