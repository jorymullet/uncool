# uncool
#### Prepare to be unimpressed.
---
## What is it
Uncool is a Vue plugin that allows copy and images to be updated on the fly.
---
## Prereqs
- Must be using Vue CLI
- Must have initialized a Firebase Project that includes the following:
  - Firestore enabled
  - Storage bucket enabled and declared in Firebase config
  - Authentication enabled and Email/Password is enabled
## Instructions
### Install
`$ npm install uncool --save`
### Include
In `src/main.js`:
```
import Vue from 'vue'
...
import * as uninitializedFirebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import 'firebase/storage'

export const firebase = uninitializedFirebase.initializeApp(*firebase_config*)
...
// must be included after Firebase has been imported and initialized
import uncool from 'uncool'
Vue.use(uncool)
import 'uncool/src/style.sass' // styling to denote editable items
```
In `src/App.vue`, include the following import, component declaration, and addition to the template:
```
<script>
import { UncoolAdmin } from 'uncool' // <--- Import at the top of the javascript
export default {
  name: 'App',
  components: {
    'uncool-admin': UncoolAdmin, // <--- declare the component
  },
}
</script>

<template>
  <div id="app">
    <uncool-admin></uncool-admin> // <--- include in the template at the top
    ...
  </div>
</template>
```
In `firestore.rules`, include the following rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    ...
    ... // Include from here...
    match /uncool/{uncoolId} {
      allow read: if true
      allow write: if exists(/databases/$(database)/documents/uncool_users/$(request.auth.uid))
    }
    match /uncool_users/{userId} {
      allow read: if userId == request.auth.uid;
    }
    ... // to here.
    ...
  }
}
```
## Add authorized editor:
If you already know the User uid you would like to authorize, skip to 2.

1) Create user
  - Go to the authentication tab in the Firebase console of your project.
  - Since Email/Password authorization should already be enabled, click `Add User`.
  - Choose an email and password you would like to use.
  - Click `Add user` and you should see the new user appear on the list of users.
  - Copy the User uid of the new user.
2) Add Uncool Editor
  - Go to the database tab in the Firebase console of your project.
  - Create a collection named `uncool_users`.
  - When prompted to create a doc, as the uid, use the User uid you are authorizing.
  - For the data, in the field, input `role` and as the value input `EDITOR`
  - Save the data
  
## How to use (as a developer):
In any Vue component, include the `uncool` directive on any element in the template to have it's content mutable by any authorized user.

Edit text example:
```
<template>
  <div class="hello">
    <div
     v-uncool='"a-unique-id"'
     > I serve as a placeholder unless no data is found in the database.
    </div> 
  </div>
</template>
```
Edit image example (be sure to include `image` on your directive): 
```
<template>
  <div class="hello">
    <div
     style='height:400px;width:400px;'
     v-uncool.image='"a-unique-image-id"'
     >
    </div> 
  </div>
</template>
```

## How to use (as an Uncool editor):
To acquire your Uncool editor authorization: 
  - Sign in:
    - press `Cmd + u`.
    - enter username and password.
    - press `login`
  - Edit element:
    - find an editable element which can be denoted in the following ways
      - a red `EDIT` in the upper right hand of the element
      - the cursor styling turns to `context-menu`
    - click on the editable element
    - edit innerHTML (or choose new img) of element and click `save`
    - changes should propogate
  - Sign out (if you would like):
    - press `Cmd + u`.
    - press `logout`
    




See, not that cool.
