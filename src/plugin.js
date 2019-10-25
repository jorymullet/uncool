import Vue from 'vue'
import * as firebase from 'firebase'
import placeholderUrl from './image-placeholder.jpg'
const eb = new Vue()
const V_IDS = new Set()
const UNCOOL_IDS = new Set()
const TO_DO_LIST = {}
let IS_AUTHORIZED = null


let UNCOOL_REF
let that

const iterateOverToDoList = () => {
  Object.keys(TO_DO_LIST).forEach(id => {
    const uncoolEle = TO_DO_LIST[id]
    uncoolCycle(uncoolEle.el, uncoolEle.binding, uncoolEle.vnode)
  })
}

const startAuthListener = async () => {
  firebase.auth().onAuthStateChanged(async user => {
    if (user) {
      IS_AUTHORIZED = (await firebase.firestore().collection('uncool_users').doc(user.uid).get()).data()
      return iterateOverToDoList()
    }
    IS_AUTHORIZED = false
  })
}

/**
 * Starts the process for each ele
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
  const openSpan = '<span class="uncool-temp">'
  const closeSpan = '</span>'
  let tempReplace = previousHTML

  const alreadyMadeTempHtml = previousHTML.indexOf(openSpan) !== -1
  if (!alreadyMadeTempHtml) {
    // to show no words but just placeholding underscores
    tempReplace = previousHTML
      .replace(new RegExp('[a-zA-Z]', 'g'), '_') //changes all letters to underscores
      .replace(new RegExp(' ', 'g'), `${closeSpan} ${openSpan}`) //encases all spaces in close and open spans
    tempReplace = openSpan + tempReplace + closeSpan
  }


  el.innerHTML = tempReplace

  // in case we want to prevent duplication later on
  UNCOOL_IDS.add(uncoolId)

  const uncoolHtml = (await UNCOOL_REF.doc(uncoolId).get()).data()
  //when uncool is unset
  if (uncoolHtml === undefined) {
    el.innerHTML = previousHTML
    return 
  }
  
  const allSpacesRegex = /^\s+$/
  if (IS_AUTHORIZED && (!uncoolHtml.html || allSpacesRegex.test(uncoolHtml.html))) {
    el.innerHTML = '(no content)'
  } else {
    el.innerHTML = uncoolHtml.html
  }
}

/**
 * Handles loading image
 */

const handleEditImage = async (el, uncoolId) => {
  el.style.backgroundImage = `url('${placeholderUrl}')`
  el.style.backgroundPosition = 'center center'
  el.style.backgroundSize = 'cover'

  const uncoolImage = (await UNCOOL_REF.doc(uncoolId).get()).data()
  if (uncoolImage === undefined) return

  el.style.backgroundImage = `url(${uncoolImage.image_url})`
}



/**
 * Handles whether user is authorized and styles Uncool elements accordingly
 */

const modeToClass = (mode) => {
  return {
    'edit-text': 'uncool-ele-text',
    'edit-image': 'uncool-ele-image',
  }[mode]
}

const determineEditableStyling = async (el, vnode, editMode, uncoolId) => {
  if (!IS_AUTHORIZED) return

  el.classList.add('uncool-ele') //marks the elements as editable
  el.classList.add(modeToClass(editMode)) //distinguishes between element types

  el.addEventListener('click', (event) => {
    event.preventDefault()

    const baseUncoolOptions = {
      mode: editMode,
      uncoolId,
      fsRef: UNCOOL_REF.doc(uncoolId),
    }
    let editTypeOptions

    if (editMode === 'edit-text') {
      el.classList.add('uncool-ele-text')
      editTypeOptions = {
        onSave: (newHtml) => {
          el.innerHTML = newHtml || '(no content)'
        },
        current: replaceSpecialHTMLChars(el.innerHTML),
      }
    } else if (editMode === 'edit-image') {
      el.classList.add('uncool-ele-image')
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

// readies text for editing

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

/**
 * The Spicy boy who initializes all of it
 */

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
    UNCOOL_REF = firebase.firestore().collection('uncool')

    Vue.directive('uncool', {
      bind: (el, binding, vnode) => {
        const uncoolId = verifyUncoolId(el, binding)
        TO_DO_LIST[uncoolId] = {el, binding, vnode}
        uncoolCycle(el, binding, vnode)
      },
    })
    iterateOverToDoList()
    startAuthListener()
  },
}