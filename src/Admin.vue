<script>
import * as firebase from 'firebase'
export default {
  name: 'UncoolAdmin',
  data () {
    return {
      seeAdmin: false,
      html: '',
      options: {},
      state: 'user',
      form: {
        email: '',
        password: '',
      }
    }
  },
  computed: {
    saveCopy () {
      return {
        user: 'save',
        system: 'loading...',
        success: 'updated!',
        failure: 'did not update',
      }[this.state]
    },
    loginCopy () {
      return {
        user: 'login',
        system: 'loggin in...',
        success: 'logged in!',
        failure: 'error!',
      }[this.state]
    },
    uploadCopy () {
      return {
        user: 'upload',
        system: 'uploading...',
        success: 'uploaded!',
        failure: 'error!',
      }[this.state]
    },
    isLoggedIn () {
      return firebase.auth().currentUser
    },
  },
  methods: {
    readyListeners () {
      this.$proOn('showUncoolAdmin', options => {
        this.seeAdmin = true
        this.options = options

        if (options.mode === 'edit-text') {
          this.html = options.current
        }
      })
      this.$proOn('hideUncoolAdmin', _ => {
        this.seeAdmin = false
      })
      this.$forceUpdate()
    },
    async onSave () {
      if (this.state !== 'user') return

      this.state = 'system'
      try {
        await this.options.fsRef.set({
          updated: Date.now(),
          html: this.html
        })
      } catch (err) {
        this.state = 'failure'
        return alert(err)
      }

      this.options.onSave(this.html)
      this.seeAdmin = false
      this.state = 'user'
    },
    async onLogin () {
      this.state = 'system'
      try {
        await firebase.auth().signInWithEmailAndPassword(this.form.email, this.form.password)
      } catch (err) {
        console.error(err)
        this.state = 'failure'
        return
      }

      this.seeAdmin = false
      this.state = 'user'
      location.reload()
    },
    onLogout () {
      firebase.auth().signOut()
      this.seeAdmin = false
      location.reload()
    },
    changeImage () {
      this.$refs.imageUpload.click()
    },
    async onImageUpload (e) {
      this.state = 'system'

      const file = e.target.files[0]
      const metadata = {
        contentType: file.type,
      }
      const storageRef = firebase.storage().ref().child(`uncool/images/${this.options.uncoolId}`)

      try {
        await storageRef.put(file, metadata)
      } catch (e) {
        console.error(e)
        this.state = 'error'
      }

      let downloadUrl
      try {
        downloadUrl = await storageRef.getDownloadURL()
      } catch (e) {
        console.error(e)
        this.state = 'error'
      }

      try {
        await this.options.fsRef.set({
          image_url: downloadUrl,
          updated: Date.now(),
        })
      } catch (e) {
        console.error(e)
        this.state = 'error'
      }

      this.state = 'success'
      this.options.onSave(downloadUrl)
      
      setTimeout(() => {
        this.seeAdmin = false
        this.state = 'user'
      }, 1000)
    },
  },
  mounted () {
    this.readyListeners()
  },
}
</script>

<template lang="pug">
  div
    .uncool-admin-main(
      v-if='seeAdmin'
      @click='() => seeAdmin = false'
    )
      .uncool-admin-container
        .stop-click(
          @click.stop=''
        )
          .content(
            v-if='options.mode === "edit-text"'
          )
            .editor-holder
              textarea(
                v-model='html'
                placeholder='<p>Some HTML action here</p>'
              )
            .action
              .cancel(
                @click='() => seeAdmin = false'
              ) cancel
              .continue(
                @click='onSave'
              ) {{saveCopy}}
          .content(
            v-else-if='options.mode === "edit-image"'
          )
            .header change image
            input.image-uploader(
              type='file'
              ref='imageUpload'
              accept='image/*'
              @change='onImageUpload'
            )
            .upload(
              @click='changeImage'
            ) {{uploadCopy}}
            .dimensions {{options.dimensions.width}}px x {{options.dimensions.height}}px
            .action
              .cancel(
                @click='() => seeAdmin = false'
              ) cancel
          .content(
            v-if='options.mode === "login" && !isLoggedIn'
          )
            .header login to uncool
            .login-form
              input(
                v-model='form.email'
                placeholder='email'
              )
              input(
                v-model='form.password'
                placeholder='password'
              )
            .action
              .cancel(
                @click='() => seeAdmin = false'
              ) cancel
              .continue(
                @click='onLogin'
              ) {{loginCopy}}
          .content(
            v-if='options.mode === "login" && isLoggedIn'
          )
            .header logout of uncool?
            .action
              .cancel(
                @click='() => seeAdmin = false'
              ) cancel
              .continue(
                @click='onLogout'
              ) logout
</template>

<style lang="sass" scoped>
  .uncool-admin-main
    font-family: monospace
    position: fixed
    top: 0
    z-index: 990
    width: 100vw
    height: 100vh
    .uncool-admin-container
      width: 100%
      height: 100%
      background-color: rgba(256, 256, 256, .5)
      display: grid
      align-items: center
      justify-items: center
      .content
        max-width: 450px
        padding: 40px 50px 20px
        background-color: white
        border: black thin solid
        .header
          margin: 0 0 15px
          font-size: 1.3em
          font-weight: bold
        .image-uploader
          display: none
        .upload
          padding: 20px
          border: thin dashed black
          text-align: center
          cursor: pointer
        .dimensions
          text-align: center
          padding: 5px 0
        .login-form
          > input
            font-family: monospace
            border: none
            border-bottom: thin black solid
            display: block
            margin: 15px 0
            font-size: 1.2em
            width: 100%
            &:focus
              outline: none
        .editor-holder
          > textarea
            resize: none
            width: 100%
            min-height: 100px
            font-family: monospace
            font-size: 1.3em
            padding: 10px
            box-sizing: border-box
            border: none
            border-bottom: thin solid black
            &:focus
              outline: none
        .action
          display: grid
          grid-template-columns: auto min-content
          justify-items: end
          padding: 15px 0
          > *
            border: black thin solid
            padding: 5px 15px
            cursor: pointer
          .cancel
            color: white
            background-color: #666
            &:hover
              background-color: black
          .continue
            margin-left: 15px
            &:hover
              background-color: black
              color: white
</style>