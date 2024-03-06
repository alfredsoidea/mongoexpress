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

async function sendMessagetoLark (thisstoken, forcompany, userdata) {
  let dataref = collection(dbstore, "message_line_"+forcompany.forcompany)
  console.log(dataref)
  const q = query(dataref, where("status", "==", "wait"), where("user_id", "==", userdata.user_id));
  const querySnapshot = await getDocs(q);
  let messagejson = [];
  await querySnapshot.forEach((doc) => {
    if (bodydata.status == 'wait') {
      let bodydata = doc.data()
      bodydata.id = doc.id
      bodydata.status = 'process'
      setMessageSent(doc.id, forcompany, 'process')
      messagejson.push(bodydata)
    }
  });
  const jsonAsArray = await Object.keys(messagejson).map(function (key) {
    return messagejson[key];
  }).sort(function (itemA, itemB) {
    return itemA.init_timestamp < itemB.init_timestamp;
  });
  await jsonAsArray.forEach((doc) => {
    sendmessage(thisstoken, forcompany, userdata, doc)
  });
  console.log("start sendMessagetoLark")
}

async function setMessageSent(datamessagekey, forcompany, statuschange) {
  let dataref = await collection(dbstore, "message_line_"+forcompany.forcompany)
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
}
async function sendmessage (thisstoken, forcompany, userdata, datamessage) {
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
        setMessageSent(datamessagekey, forcompany, 'sent')
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
        setMessageSent(datamessagekey, forcompany, 'sent')
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

        setMessageSent(datamessagekey, forcompany, 'sent')
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
        setMessageSent(datamessagekey, forcompany, 'sent')
        break;
      default:
    }
  }
}

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
  console.log(JSON.stringify(req.body))
  let allmessage = requestbody['events']
  let userId = allmessage[0]['source']['userId']
  //set message to  firebase [status:wait]
  allmessage.forEach((currentElement, index) => {
    addDoc(collection(dbstore, "message_line_"+thisparam), {
      init_timestamp: currentElement.timestamp,
      user_id: userId,
      message_data: currentElement,
      status: "wait",
      forcompany: thisparam
    });
  })
  let countallmessage = 0;
  var thisstoken = "";
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
  let checkuserline = await axios.get('https://larkapi.soidea.co/checkuserline/'+thisparam+'/'+userId+'/'+thisstoken);
  sendMessagetoLark(thisstoken, thisforcompany.data , userdata)
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
