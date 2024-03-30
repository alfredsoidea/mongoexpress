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
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, uploadString } from "firebase/storage";
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
          serverTimestamp,
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


app.get('/mockuproom/:forcompany/:roomid', async (req, res) => {
  let thisroomid = req.params.roomid
  let thisparam = req.params.forcompany
  let thisforcompany = await functionjs.getForcompany(thisparam)
  let thisstokenres = await functionjs.getTokenlark(thisforcompany)
  let thisstoken = await thisstokenres
  let data2return = await axios.request({
    headers: {
      Authorization: 'Bearer '+thisstoken,
      'Content-Type': 'application/json',
    },
    method: "DELETE",
    data: {
      "id_list": [ "d9cdg11a","6dae7g89","7fbdbba2","22d2d869","64b6ffa4","bf6a1c16","19ed8f51","8317b15e","faa997a2","9gdc9a6c","54eg842f","b5459dc6","db2dgba3","gb5f4833","b4gfa3d5","c8252377","f5b74daa","6dbg4e65","fd8gef52","85612fc1","46398ccb","e7g76dg8" ]
    },
    url: "https://open.larksuite.com/open-apis/im/v1/chats/oc_c356a428a47424c9a3a4de63cbba4697/members?member_id_type=user_id"
  })
  await res.status(200).send(thisstoken)
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

app.post('/lark/webhook/:forcompany', async (req, res) => {
  let thisforcompany,thisstokenres
  let thisparam = req.params.forcompany
  let requestbody = req.body
  thisforcompany = await functionjs.getForcompany(thisparam)
  console.log(JSON.stringify(req.body))
  console.log(req.body)
  if (requestbody.type == "url_verification") {
    console.log({ "challenge": requestbody.challenge })
    await res.status(200).send({ "challenge": requestbody.challenge })
  } else {
    let messageraw = requestbody['event']
    let thislarkchatid = messageraw.message.chat_id
    let resuser = await functionjs.get_userline_data_larkchat(thisforcompany, thislarkchatid)
    await addDoc(collection(dbstore, "message_lark_"+thisparam), {
      init_timestamp: requestbody['event'].message.create_time,
      user_id: resuser.user_id,
      message_data: messageraw.message,
      status: "wait",
      forcompany: thisparam,
      timestamp: serverTimestamp(),
      created_at: Date.now()
    });
    let thisstoken = await functionjs.getTokenlark(thisforcompany)
    let querymess = await functionjs.query_message_by_larkchat(thisstoken, thisforcompany, resuser)
    await res.status(200).send("ok")
  }
})

app.post('/lark/groupchat/:forcompany', async (req, res) => {
  let thisforcompany,thisstokenres
  let thisparam = req.params.forcompany
  thisforcompany = await functionjs.getForcompany(thisparam)
  thisstokenres = await functionjs.getTokenlark(thisforcompany)
  axios.request({
    headers: {
      Authorization: `Bearer ${thisstokenres}`,
      'Content-Type': "application/json; charset=utf-8",
    },
    method: "DELETE",
    url: 'https://open.larksuite.com/open-apis/im/v1/chats/oc_c356a428a47424c9a3a4de63cbba4697/members?member_id_type=user_id',
    data: {"id_list": ["d9cdg11a","6dae7g89","7fbdbba2","22d2d869","64b6ffa4","bf6a1c16","19ed8f51","8317b15e","faa997a2","9gdc9a6c","54eg842f","b5459dc6","db2dgba3","gb5f4833","b4gfa3d5","c8252377","f5b74daa","6dbg4e65","fd8gef52","85612fc1","46398ccb","e7g76dg8"]}
  })
  await res.status(200).send("ok")
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
  let dataref = await collection(dbstore, "message_line_"+thisparam)
  const q = query(dataref, where("status", "==", "wait"));
  const querySnapshot = await getDocs(q);
  let messagejson = [];
  await querySnapshot.forEach((doc) => {
    send_message_by_webhook(thisstoken, thisforcompany.data, doc.data())
  });
  res.status(200).send('ok')
})

app.get('/testmail/:otp/:mail', (req, res) => {
  let otp = req.params.otp
  let mail = req.params.mail
  let thisstokenres = axios.post('https://api.mailersend.com/v1/email', {
      "from": {
        "email": "daikin100yearMS_eZVj0K@trial-3z0vkloj76xg7qrx.mlsender.net",
        "name": "Daikin 100 Years Campaign"
      },
      "to": [
        {
          "email": mail
        }
      ],
      "subject": "Please Verify OTP for email",
      "html": "<div style='padding-top: 20px; padding-bottom: 20px;'><div style='text-align: center;'><img style='display: inline-block' src='https://firebasestorage.googleapis.com/v0/b/daikin-8f1c5.appspot.com/o/daikinlogo.png?alt=media&token=7a16ddb0-6774-4400-be37-87ff795850d5' height='50'></div><div style='margin-top: 20px; text-align: center; font-size: 24px'>Your OTP</div><div style='margin-top: 20px; text-align: center; font-size: 18px'>Please use below verification code below to verify your e-mail address. <br>The code will expire in 10 minutes and can be used only once.</div><div style='text-align: center; margin-top: 20px;'><div style='display: inline-block; line-height: 50px; letter-spacing: 10px; background: #0099E6; height: 50px; padding-left: 20px; padding-right: 10px; color: #fff; font-size: 24px; color: #fff'>"+ otp +"</div><div style='margin-top: 20px;'>If you did not request a code, please ignore this e-mail.Daikin Thailand</div></div></div>"
    }, {
    headers: { 'Authorization': 'Bearer mlsn.4afb67ee2e37f63cffec5f0379fa5baaa01b6c5fdaa75b3661f671e1f3ce045f' }
  })
  res.status(200).send('ok')
});

app.post('/upload_firebase', multer({limits: { fieldSize: 30 * 1024 * 1024 }}).single('file') , async (req, res) => {
  console.log(req.filedata)
  console.log("req.file end")
  let file = req.body.filedata
  const metadata = {
    contentType: 'image/jpeg'
  };
  const storageRef = await ref(storage, 'images/' + functionjs.makeid(30) + "-image");

  const uploadTask = uploadBytes(storageRef, file).then((snapshot) => {
    //console.log(snapshot)
  });
  // uploadTask.on('state_changed', (snapshot) => {
  //     console.log(snapshot)
  //     const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  //     console.log('Upload is ' + progress + '% done');
  //     switch (snapshot.state) {
  //       case 'paused':
  //         console.log('Upload is paused');
  //         break;
  //       case 'running':
  //         console.log('Upload is running');
  //         break;
  //     }
  //   }, 
  //   (error) => {
  //     switch (error.code) {
  //       case 'storage/unauthorized':
  //         break;
  //       case 'storage/canceled':
  //         break;
  //       case 'storage/unknown':
  //         break;
  //     }
  //   }, () => {
  //     getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
  //       res.status(200).send(downloadURL)
  //     });
  //   }
  // );
})

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Listening: http://localhost:${port}`);
});

app.post('/upload_firebase_data', multer({
    limits: { fieldSize: 30 * 1024 * 1024 }
  }).single('file') , async (req, res) => {
  console.log("req.file")
  console.log(req.body)
  console.log("req.file end")
  let file = req.file
  const metadata = {
    contentType: 'image/jpeg'
  };
  const storageRef = await ref(storage, 'images/' + functionjs.makeid(30) + "-image");
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
        res.status(200).send(downloadURL)
      });
    }
  );

});

export default  app;
