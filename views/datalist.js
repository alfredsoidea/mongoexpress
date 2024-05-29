// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
  import { getFirestore } from "firebase/firestore";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBKU0BuRrLaVudLHwPjlMpVHkK5tW645Yo",
    authDomain: "alfred-line-webhook-api.firebaseapp.com",
    projectId: "alfred-line-webhook-api",
    storageBucket: "alfred-line-webhook-api.appspot.com",
    messagingSenderId: "586062678452",
    appId: "1:586062678452:web:5aa9ba7ae0ae18bd770ae1"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log(db)

  db.collection("userline_penkhr").onSnapshot((doc) => {
    console.log(doc.data());
  });