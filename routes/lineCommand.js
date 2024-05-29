import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import multer from 'multer';
import request from 'request';
import axios from 'axios';
import OpenAI from 'openai';

import functionjs from "../functionjs/index.js";
import fs from 'fs';
import path from 'path';

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

const lineCommand = (app) => {
    
  app.get('/', (req, res) => {
    res.json({message: 'te123st'});
  });

  app.post('/forcemessage/line/webhook/:forcompany/:recordid', async (req, res) => {
    let thisparam = req.params.forcompany
    let recordid = req.params.recordid
    const docRef = doc(dbstore, "message_line_"+thisparam, recordid)
    const docSnap = await getDoc(docRef);
    let thismessdata = await docSnap.data()
    thismessdata.id = recordid
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisstokenres = await functionjs.getTokenlark(thisforcompany)
    await functionjs.send_message_by_userid(thisstokenres, thisforcompany, thismessdata.user_id, thismessdata)
    await res.status(200).send('ok')
  });

  app.post('/forcemessage_fixroom_all/line/webhook/:forcompany', async (req, res) => {
    let thisparam = req.params.forcompany
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisstokenres = await functionjs.getTokenlark(thisforcompany)
    let responsecreate, responsequery
    let dataref = await collection(dbstore, "userline_"+thisparam)
    const qpre = await query(dataref, where("larkchatid", "==", "pre"));
    const querySnapshot = await getDocs(qpre);
    let newdatajson = []

    let counter = 3

    await querySnapshot.forEach(async (doc) => {
      let bodydata = doc.data()
      bodydata.id = doc.id
      newdatajson.push(bodydata)
    });

    await newdatajson.forEach(async (element) => {
      if (counter >= 0) {
        responsecreate = await functionjs.create_userline(thisforcompany, element.id, thisstokenres)
        responsequery = await functionjs.query_message_by_user(thisstokenres, thisforcompany ,element.id)
      }
      counter = counter - 1
    });

    await res.status(200).send('ok')
  });

  app.post('/forcemessage_fixroom/line/webhook/:forcompany/:recordid', async (req, res) => {
    let thisparam = req.params.forcompany
    let recordid = req.params.recordid
    const docRef = doc(dbstore, "userline_"+thisparam, recordid)
    const docSnap = await getDoc(docRef);
    let thisuserdata = await docSnap.data()
    thisuserdata.id = recordid
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisstokenres = await functionjs.getTokenlark(thisforcompany)
    let responsecreate = await functionjs.create_userline(thisforcompany, recordid, thisstokenres)
    let responsequery = await functionjs.query_message_by_user(thisstokenres, thisforcompany ,recordid)
    await res.status(200).send('ok')
  });

  app.get('/mockuproom/:forcompany/:roomid', async (req, res) => {
    let thisroomid = req.params.roomid
    let thisparam = req.params.forcompany
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisstokenres = await functionjs.getTokenlark(thisforcompany)
    let thisstoken = await thisstokenres
    // let data2return = await axios.request({
    //   headers: {
    //     Authorization: 'Bearer '+thisstoken,
    //     'Content-Type': 'application/json',
    //   },
    //   method: "DELETE",
    //   data: {
    //     "id_list": [ "f435agf8" ]
    //   },
    //   url: "https://open.larksuite.com/open-apis/im/v1/chats/oc_9b1b87f5c8ae311d93ab1ab29c03d048/members?member_id_type=user_id"
    // })
    await res.status(200).send(thisstoken)
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
};

export { lineCommand };