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
          type="success" block round style="margin-top: 20px;"
          @click="startPractice('all')"
          :disabled="totalWordsInDB === 0"
        >
          开始刷题！(全部)
        </van-button>

        <van-button 
          type="warning" block round style="margin-top: 15px;"
          @click="startPractice('reading_wrong')"
          :disabled="readingWrongCount === 0"
        >
          复习阅读错题本 ({{ readingWrongCount }}个)
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
          
          <!-- 【全局收藏星星】即使做对了也可以随时点击收藏 -->
          <van-icon 
            :name="currentQuestion.reading_wrong_count > 0 ? 'star' : 'star-o'" 
            size="26" 
            :color="currentQuestion.reading_wrong_count > 0 ? '#fadb14' : '#ccc'" 
            style="margin-left: 15px; cursor: pointer;"
            @click="toggleFav" 
          />
        </div>
        
        <!-- 【完美隐藏】没作答时不给任何提示，作答后直接显示原词意思 -->
        <p style="text-align: center; color: #999; margin: 0 0 10px 0; min-height: 20px;">
          <span v-if="hasAnswered">【原词释义】{{ currentQuestion.meaning }}</span>
        </p>

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
            <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.4;">
              <span>{{ option }}</span>
              <span v-if="hasAnswered" class="option-meaning">
                {{ getOptionMeaning(option) }}
              </span>
            </div>
          </van-button>
        </div>
      </van-cell-group>

      <div v-if="hasAnswered" class="action-area">
        <van-notice-bar 
          :text="isCorrect ? '回答正确！🎉' : '回答错误。正确近义词是: ' + currentTargetSynonym" 
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
import { ref, onMounted, computed } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { supabase } from './supabase'
import Papa from 'papaparse'

const isPracticing = ref(false)
const practiceMode = ref('all') 
const totalWordsInDB = ref(0)
const wordBank = ref([])

const score = ref(0)
const currentQuestion = ref(null)
const currentTargetSynonym = ref('') 
const currentOptions = ref([])
const hasAnswered = ref(false)
const selectedOption = ref(null)
const isCorrect = ref(false)

const readingWrongCount = computed(() => wordBank.value.filter(w => w.reading_wrong_count > 0).length)

const fetchWordsCount = async () => {
  const { data, error } = await supabase.from('words').select('*')
  if (!error && data) {
    wordBank.value = data
    totalWordsInDB.value = data.length
  }
}

const getRandomSingleWord = (str) => {
  if (!str) return ''
  const words = str.split(',').map(s => s.trim()).filter(Boolean)
  if (words.length === 0) return ''
  return words[Math.floor(Math.random() * words.length)]
}

const updateWrongCount = async (wordId, newCount) => {
  const { error } = await supabase
    .from('words')
    .update({ reading_wrong_count: newCount })
    .eq('id', wordId)
  
  if (!error) {
    const idx = wordBank.value.findIndex(w => w.id === wordId)
    if (idx > -1) wordBank.value[idx].reading_wrong_count = newCount
  }
}

const toggleFav = () => {
  const q = currentQuestion.value
  const currentCount = q.reading_wrong_count || 0
  const newCount = currentCount > 0 ? 0 : 1 
  q.reading_wrong_count = newCount
  updateWrongCount(q.id, newCount)
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

const startPractice = (mode) => {
  practiceMode.value = mode
  const pool = mode === 'reading_wrong' ? wordBank.value.filter(w => w.reading_wrong_count > 0) : wordBank.value
  
  if (pool.length < 4) {
    showToast(`当前模式下的词库太少（需至少4个词）！`)
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
  
  const pool = practiceMode.value === 'reading_wrong' ? wordBank.value.filter(w => w.reading_wrong_count > 0) : wordBank.value
  const randomIndex = Math.floor(Math.random() * pool.length)
  const q = pool[randomIndex]
  currentQuestion.value = q
  
  currentTargetSynonym.value = getRandomSingleWord(q.synonym)
  let options = [currentTargetSynonym.value].filter(Boolean)
  
  while (options.length < 4) {
    const randomFallback = wordBank.value[Math.floor(Math.random() * wordBank.value.length)]
    const fakeOption = Math.random() > 0.5 ? getRandomSingleWord(randomFallback.synonym) : getRandomSingleWord(randomFallback.antonym)
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
  isCorrect.value = (option === currentTargetSynonym.value)
  
  if (isCorrect.value) {
    score.value++
  } else {
    // 答错了自动增加阅读错题次数
    const currentCount = currentQuestion.value.reading_wrong_count || 0
    currentQuestion.value.reading_wrong_count = currentCount + 1
    updateWrongCount(currentQuestion.value.id, currentCount + 1)
  }
  speak(option)
}

const getOptionMeaning = (opt) => {
  const found = wordBank.value.find(w => 
    (w.synonym && w.synonym.includes(opt)) || 
    (w.antonym && w.antonym.includes(opt)) || 
    w.word === opt
  )
  return found ? found.meaning : ''
}

const getButtonType = (option) => {
  if (!hasAnswered.value) return 'default'
  if (option === currentTargetSynonym.value) return 'success'
  if (option === selectedOption.value && !isCorrect.value) return 'danger'
  return 'default'
}

onMounted(() => {
  fetchWordsCount()
})
</script>

<style scoped>
.app-container { min-height: 100vh; background-color: #f2f3f5; }
.control-panel, .content { padding: 16px; }
.score-board { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; }
.question-card { padding: 24px 16px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.word-display { display: flex; justify-content: center; align-items: center; margin-bottom: 5px; }
.word-display h2 { margin: 0; font-size: 28px; color: #333; }
.options-list { display: flex; flex-direction: column; gap: 12px; }
.option-btn { border-radius: 8px; font-size: 16px; min-height: 48px; height: auto; padding: 10px 0; }
.option-meaning { font-size: 12px; opacity: 0.8; margin-top: 2px; font-weight: normal; }
.action-area { margin-top: 24px; }
</style>