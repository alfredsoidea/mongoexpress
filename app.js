import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';

import functionjs from "./functionjs/index.js";

console.log(functionjs.sayHello())

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
          runTransaction,
          serverTimestamp
} from "firebase/firestore";

const storage = getStorage();
const dbstore = getFirestore();
const app = express();


app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({message: 'test'});
});

app.post('/line/webhook/:forcompany', async (req, res) => {
  let resuser,thisforcompany,thisstokenres
  let thisparam = req.params.forcompany
  let requestbody = req.body
  console.log(JSON.stringify(req.body))
  let allmessage = requestbody['events']
  let userId = allmessage[0]['source']['userId']
  let thisstoken
  const docRef = doc(dbstore, "userline_"+thisparam, userId)
  const docSnap = await getDoc(docRef);
  let thisuserdata = await docSnap.data()
  if (docSnap.exists()) {
    await allmessage.forEach((currentElement, index) => {
      if (currentElement.type != 'unfollow' && currentElement.type != 'follow') {
        addDoc(collection(dbstore, "message_line_"+thisparam), {
          init_timestamp: currentElement.timestamp,
          user_id: userId,
          message_data: currentElement,
          status: "wait",
          forcompany: thisparam,
          timestamp: serverTimestamp(),
          created_at: Date.now()
        });
      }
    })
    if (thisuserdata.larkchatid == "pre") {
      await res.status(200).send('ok')
    } else {
        resuser = await functionjs.get_userline_data(thisforcompany, userId, thisstoken)
        thisforcompany = await functionjs.getForcompany(thisparam)
        thisstokenres = await functionjs.getTokenlark(thisforcompany)
        thisstoken = thisstokenres
        await functionjs.query_message_by_user(thisstoken, thisforcompany , userId)
      await res.status(200).send('ok')
    }
  } else {
    await setDoc(doc(dbstore, "userline_"+thisparam, userId), {
      forcompany: thisparam,
      timestamp: serverTimestamp(),
      displayname: "pre",
      larkchatid: "pre",
      pictureurl: "pre",
      user_id: userId
    });
    thisforcompany = await functionjs.getForcompany(thisparam)
    thisstokenres = await functionjs.getTokenlark(thisforcompany)
    thisstoken = thisstokenres
    await allmessage.forEach((currentElement, index) => {
      if (currentElement.type != 'unfollow' && currentElement.type != 'follow') {
        addDoc(collection(dbstore, "message_line_"+thisparam), {
          init_timestamp: currentElement.timestamp,
          user_id: userId,
          message_data: currentElement,
          status: "wait",
          forcompany: thisparam,
          timestamp: serverTimestamp(),
          created_at: Date.now()
        });
      }
    })
    let responsecreate = await functionjs.create_userline(thisforcompany, userId, thisstoken)
    console.log(responsecreate)
    let responsequery = await functionjs.query_message_by_user(thisstoken, thisforcompany , userId)
    console.log(responsequery)
    await res.status(200).send('ok')
  }
})

app.post('/line-checkdata/:forcompany', async (req, res) => {
  let thisparam = req.params.forcompany
  let thisforcompany = await axios.get('https://larkapi.soidea.co/getforcompany/'+thisparam);
  let thisstokenres  = await axios.post('https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal', {
    'app_id': thisforcompany.data.lark_app_api,
    'app_secret': thisforcompany.data.lark_app_secret
  }, {
    headers: { 'Content-type': 'application/json; charset=utf-8' }
  })
  let thisstoken = thisstokenres.data.tenant_access_token
  console.log(await thisstoken)
  let dataref = await collection(dbstore, "message_line_"+thisparam)
  const q = query(dataref, where("status", "==", "wait"));
  const querySnapshot = await getDocs(q);
  let messagejson = [];
  await querySnapshot.forEach((doc) => {
    send_message_by_webhook(thisstoken, thisforcompany.data, doc.data())
  });
  res.status(200).send('ok')
})

app.post('/upload_firebase', multer().single('file') , (req, res) => {
  let file = req.file.buffer
  console.log(req.file)
  console.log(req.body)
  const metadata = {
    contentType: req.file.mimetype
  };
  const storageRef = ref(storage, 'images/' + functionjs.makeid(20) + "-" + req.file.originalname);
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

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Listening: http://localhost:${port}`);
});



export default  app;
