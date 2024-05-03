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

const lineCommand = (app) => {
    
  app.get('/', (req, res) => {
    res.json({message: 'te123st'});
  });

  app.post('/forcemessage/line/webhook/:forcompany/:recordid', async (req, res) => {
    let thisparam = req.params.forcompany
    let recordid = req.params.recordid
    const docRef = doc(dbstore, "message_line_"+thisparam, recordid)
    const docSnap = await getDoc(docRef);
    let thisuserdata = await docSnap.data()
    thisuserdata.id = recordid
    let thisforcompany = await functionjs.getForcompany(thisparam)
    let thisstokenres = await functionjs.getTokenlark(thisforcompany)
    await functionjs.send_message_by_userid(thisstokenres, thisforcompany, thisuserdata.user_id, thisuserdata)
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