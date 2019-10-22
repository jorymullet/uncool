import Vue from 'vue'
import * as FIREBASE from 'firebase'
const eb = new Vue()
const V_IDS = new Set()
const UNCOOL_IDS = new Set()

let UNCOOL_REF
let that

/**
 * Actual plugin
 */

const uncoolCycle = async (el, binding, vnode) => {
  const uncoolId = verifyUncoolId(el, binding)

  const editMode = getEditMode(binding)
  
  determineEditableStyling(el, vnode, editMode, uncoolId)

  if (editMode === 'edit-text') {
    handleEditText(el, uncoolId)
  } else if (editMode === 'edit-image') {
    handleEditImage(el, uncoolId)
  }

}
/**
 * Handles loading text
 */

const handleEditText = async (el, uncoolId) => {
  const previousHTML = el.innerHTML

  // to show no words but just placeholding underscores
  const tempReplace = previousHTML.replace(new RegExp('[a-zA-Z]', 'g'), '_')
  el.innerHTML = tempReplace

  // in case we want to prevent duplication later on
  UNCOOL_IDS.add(uncoolId)

  const uncoolHtml = (await UNCOOL_REF.doc(uncoolId).get()).data()
  //when uncool is unset
  if (uncoolHtml === undefined) {
    el.innerHTML = previousHTML
    return 
  }

  el.innerHTML = uncoolHtml.html
}

/**
 * Handles loading text
 */

const handleEditImage = async (el, uncoolId) => {
  el.style.backgroundImage = `url('https://wolper.com.au/wp-content/uploads/2017/10/image-placeholder.jpg')`
  el.style.backgroundPosition = 'center center'
  el.style.backgroundSize = 'cover'

  const uncoolImage = (await UNCOOL_REF.doc(uncoolId).get()).data()
  if (uncoolImage === undefined) return

  el.style.backgroundImage = `url(${uncoolImage.image_url})`
}


export default {
  install: function (Vue) {
    that = new Vue()
    Vue.prototype.$proOn = function (handle, func) {
      eb.$on(handle, func)
    }
    Vue.prototype.$proEmit = function (handle, options) {
      eb.$emit(handle, options)
    }
    // makes the Vue component globally available
    UNCOOL_REF = FIREBASE.firestore().collection('uncool')

    Vue.directive('uncool', {
      bind: uncoolCycle,
    })
  },
}


/**
 * Handles whether user is authorized and styles Uncool elements accordingly
 */

const replaceSpecialHTMLChars = (text) => {
  let output = text
  const replacers = {
    '&amp;': '&',
    '&gt;': '>',
    '&lt;': '<',
  }
  Object.keys(replacers).forEach(regexString => {
    output = output.replace(new RegExp(regexString, 'g'), replacers[regexString])
  })
  return output
}

const determineEditableStyling = async (el, vnode, editMode, uncoolId) => {
  const authUser = FIREBASE.auth().currentUser
  let isUncoolEditor = false
  if (authUser) {
    isUncoolEditor = (await FIREBASE.firestore().collection('uncool_users').doc(authUser.uid).get()).data()
  }


  if (isUncoolEditor) {
    el.classList.add('uncool-ele') //marks the elements as editable

    el.addEventListener('click', (event) => {
      event.preventDefault()

      const baseUncoolOptions = {
        mode: editMode,
        uncoolId,
        fsRef: UNCOOL_REF.doc(uncoolId),
      }
      let editTypeOptions

      if (editMode === 'edit-text') {
        editTypeOptions = {
          onSave: (newHtml) => {
            el.innerHTML = newHtml
          },
          current: replaceSpecialHTMLChars(el.innerHTML),
        }
      } else if (editMode === 'edit-image') {
        editTypeOptions = {
          dimensions: {
            height: el.offsetHeight,
            width: el.offsetWidth,
          },
          onSave: (newUrl) => {
            el.style.backgroundImage = `url(${newUrl})`
          },
        }
      }

      vnode.context.$proEmit('showUncoolAdmin', {
        ...baseUncoolOptions,
        ...editTypeOptions,
      })
    })
  }
}

/**
 * Determines which edit mode we are in
 */

const getEditMode = (binding) => {
  const type = Object.keys(binding.modifiers)[0]
  if (!type) return 'edit-text' //no declaration means it is text
  return {
    image: 'edit-image',
  }[type]
}

/**
 * Purely for listening in order to show the Uncool login module
 */

const ENGAGED_KEYS = {}

const checkKeys = () => {
  const correctNumberOfEngagedKeys = Object.keys(ENGAGED_KEYS).length === 2
  if (!correctNumberOfEngagedKeys) return

  const correctKeys = ['MetaLeft', 'KeyU'].every(code => ENGAGED_KEYS[code])
  if (!correctKeys) return

  const correctOrder = ENGAGED_KEYS['MetaLeft'] < ENGAGED_KEYS['KeyU']
  if (!correctOrder) return
  
  that.$proEmit('showUncoolAdmin', {
    mode: 'login',
  })
}

document.addEventListener('keydown', (e) => {
  ENGAGED_KEYS[e.code] = Date.now()
  checkKeys()
})

document.addEventListener('keyup', (e) => {
  delete ENGAGED_KEYS[e.code]
})


/**
 * Prevents ID duplicates
 */

const verifyUncoolId = (el, binding) => {
  const uncoolId = binding.value //Object.keys(binding.modifiers)[0]
  const vId = Object.keys(el.dataset)[0] // the very first data attribute is the Vue ID I think so I'm rolling with it.
  if (UNCOOL_IDS.has(uncoolId) && !V_IDS.has(vId)) throw Error('Cannot have 2 uncool ids be the same.')
  UNCOOL_IDS.add(uncoolId)
  V_IDS.add(vId)
  return uncoolId
}