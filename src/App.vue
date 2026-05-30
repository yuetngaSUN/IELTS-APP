<template>
  <div class="app-container">
    <van-nav-bar title="雅思云端特训" style="background-color: #f7f8fa;" />

    <div class="control-panel" v-if="!isPracticing">
      <van-notice-bar left-icon="info-o" :text="'当前云端词库共有 ' + totalWordsInDB + ' 个单词'" />
      
      <div style="margin: 20px 16px;">
        <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload">
          <van-button icon="plus" type="primary" plain block>上传自制词书 (CSV格式)</van-button>
        </van-uploader>
        
        <van-button 
          type="success" 
          block 
          round 
          style="margin-top: 20px;"
          @click="startPractice"
          :disabled="totalWordsInDB === 0"
        >
          开始刷题！
        </van-button>
      </div>
    </div>

    <div class="content" v-else>
      <div class="score-board">
        <span>当前得分: {{ score }}</span>
        <span style="color:#1989fa; cursor:pointer;" @click="isPracticing = false">退出练习</span>
      </div>

      <van-cell-group inset class="question-card" v-if="currentQuestion">
        <div class="word-display">
          <h2>{{ currentQuestion.word }}</h2>
          <van-icon name="volume-o" size="24" @click="speak(currentQuestion.word)" style="color:#1989fa; margin-left: 10px;" />
        </div>
        
        <p style="text-align: center; color: #999; margin: 0 0 10px 0;">{{ currentQuestion.meaning }}</p>
        <p style="text-align: center; color: #666; margin-bottom: 20px; font-weight: bold;">请选择与上面单词意思相近的词</p>

        <div class="options-list">
          <van-button 
            v-for="(option, index) in currentOptions" 
            :key="index"
            block 
            class="option-btn"
            :type="getButtonType(option)"
            @click="handleSelect(option)"
            :disabled="hasAnswered"
          >
            {{ option }}
          </van-button>
        </div>
      </van-cell-group>

      <div v-if="hasAnswered" class="action-area">
        <van-notice-bar 
          :text="isCorrect ? '回答正确！🎉' : '回答错误。正确近义词是: ' + currentQuestion.synonym" 
          :color="isCorrect ? '#07c160' : '#ee0a24'"
          :background="isCorrect ? '#e8fbec' : '#ffe1e1'"
          style="margin-bottom: 20px; border-radius: 8px;"
        />
        <van-button type="primary" block round @click="nextQuestion">
          下一题
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { supabase } from './supabase'
import Papa from 'papaparse'

const isPracticing = ref(false)
const totalWordsInDB = ref(0)
const wordBank = ref([])

const score = ref(0)
const currentQuestion = ref(null)
const currentOptions = ref([])
const hasAnswered = ref(false)
const selectedOption = ref(null)
const isCorrect = ref(false)

const fetchWordsCount = async () => {
  const { data, error } = await supabase.from('words').select('*')
  if (!error && data) {
    wordBank.value = data
    totalWordsInDB.value = data.length
  }
}

const handleFileUpload = (fileObj) => {
  const file = fileObj.file
  showLoadingToast({ message: '正在上传到云端...', forbidClick: true })
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data
      const { error } = await supabase.from('words').insert(rows)
      
      closeToast()
      if (error) {
        showToast('上传失败: ' + error.message)
      } else {
        showToast('上传成功！')
        fetchWordsCount()
      }
    }
  })
}

const startPractice = () => {
  if (wordBank.value.length < 4) {
    showToast('词库里的单词太少了（少于4个），请先上传多一点单词再刷题！')
    return
  }
  isPracticing.value = true
  score.value = 0
  nextQuestion()
}

const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const nextQuestion = () => {
  hasAnswered.value = false
  selectedOption.value = null
  
  const randomIndex = Math.floor(Math.random() * wordBank.value.length)
  const q = wordBank.value[randomIndex]
  currentQuestion.value = q
  
  let options = [q.synonym, q.antonym].filter(Boolean)
  
  while (options.length < 4) {
    const randomFallback = wordBank.value[Math.floor(Math.random() * wordBank.value.length)]
    const fakeOption = Math.random() > 0.5 ? randomFallback.synonym : randomFallback.antonym
    if (fakeOption && !options.includes(fakeOption)) {
      options.push(fakeOption)
    }
  }
  
  currentOptions.value = shuffleArray(options)
  speak(q.word)
}

const handleSelect = (option) => {
  selectedOption.value = option
  hasAnswered.value = true
  isCorrect.value = (option === currentQuestion.value.synonym)
  if (isCorrect.value) score.value++
  speak(option)
}

const getButtonType = (option) => {
  if (!hasAnswered.value) return 'default'
  if (option === currentQuestion.value.synonym) return 'success'
  if (option === selectedOption.value && !isCorrect.value) return 'danger'
  return 'default'
}

onMounted(() => {
  fetchWordsCount()
})
</script>

<style scoped>
.app-container {
  min-height: 100vh;
  background-color: #f2f3f5;
}
.control-panel, .content {
  padding: 16px;
}
.score-board {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-weight: bold;
}
.question-card {
  padding: 24px 16px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.word-display {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 5px;
}
.word-display h2 {
  margin: 0;
  font-size: 28px;
  color: #333;
}
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.option-btn {
  border-radius: 8px;
  font-size: 16px;
  height: 48px;
}
.action-area {
  margin-top: 24px;
}
</style>
