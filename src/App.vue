<template>
  <div class="app-container">
    <van-nav-bar title="IELTS-WORDS" style="background-color: #f7f8fa;" />

    <!-- 第一页：控制台 -->
    <div class="control-panel" v-if="!isPracticing">
      <van-notice-bar left-icon="info-o" :text="'当前云端词库共有 ' + totalWordsInDB + ' 个单词'" />
      
      <div style="margin: 20px 16px;">
        <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload">
          <van-button icon="description" type="primary" plain block>上传自制词书 (CSV格式)</van-button>
        </van-uploader>
        
        <!-- 新增：手动添加单词按钮 -->
        <van-button icon="plus" type="primary" plain block style="margin-top: 15px;" @click="showAddDialog = true">
          手动录入单个单词
        </van-button>
        
        <van-button 
          type="success" 
          block 
          round 
          style="margin-top: 30px;"
          @click="startPractice"
          :disabled="totalWordsInDB === 0"
        >
          开始刷题！
        </van-button>
      </div>
    </div>

    <!-- 第二页：刷题页面 -->
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
            v-for="(optionObj, index) in currentOptions" 
            :key="index"
            block 
            class="option-btn"
            :type="getButtonType(optionObj.text)"
            @click="handleSelect(optionObj.text)"
            :disabled="hasAnswered"
          >
            <!-- 始终显示英文选项 -->
            <span class="option-text">{{ optionObj.text }}</span>
            <!-- 答题后显示对应的中文意思 -->
            <span v-if="hasAnswered" class="option-meaning">{{ optionObj.meaning || '' }}</span>
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

    <!-- 新增：手动添加单词的弹窗 -->
    <van-dialog 
      v-model:show="showAddDialog" 
      title="录入新单词" 
      show-cancel-button 
      @confirm="submitSingleWord"
    >
      <van-cell-group inset style="margin: 15px 0;">
        <van-field v-model="newWordForm.word" label="单词" placeholder="例: resemble" />
        <van-field v-model="newWordForm.meaning" label="意思" placeholder="例: v.像，与……相似" />
        <van-field v-model="newWordForm.synonym" label="近义词" placeholder="多个用 | 或逗号隔开" />
      </van-cell-group>
    </van-dialog>

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

// 新增：控制弹窗和表单数据
const showAddDialog = ref(false)
const newWordForm = ref({
  word: '',
  meaning: '',
  synonym: ''
})

const fetchWordsCount = async () => {
  const { data, error } = await supabase.from('words').select('*')
  if (!error && data) {
    wordBank.value = data
    totalWordsInDB.value = data.length
  }
}

// 新增：提交单个单词到数据库
const submitSingleWord = async () => {
  if (!newWordForm.value.word || !newWordForm.value.meaning) {
    showToast('单词和意思不能为空哦！')
    return
  }

  showLoadingToast({ message: '正在保存...', forbidClick: true })
  
  const { error } = await supabase.from('words').insert({
    word: newWordForm.value.word,
    meaning: newWordForm.value.meaning,
    synonym: newWordForm.value.synonym
  })

  closeToast()
  if (error) {
    showToast('添加失败: ' + error.message)
  } else {
    showToast('添加成功！')
    newWordForm.value = { word: '', meaning: '', synonym: '' } // 清空表单
    fetchWordsCount() // 刷新单词总数
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

// 修改：出题时同时保存选项的中文意思
const nextQuestion = () => {
  hasAnswered.value = false
  selectedOption.value = null
  
  const randomIndex = Math.floor(Math.random() * wordBank.value.length)
  const q = wordBank.value[randomIndex]
  currentQuestion.value = q
  
  // 建立选项池，这里存放对象 { text: 'english', meaning: '中文' }
  let optionsPool = []
  
  // 放入正确答案（如果有近义词的话）
  if (q.synonym) {
    // 因为正确近义词其实就是这道题单词的变体，可以共用原单词的意思
    optionsPool.push({ text: q.synonym, meaning: q.meaning })
  }

  // 找干扰项直到凑够4个选项
  while (optionsPool.length < 4) {
    const randomFallback = wordBank.value[Math.floor(Math.random() * wordBank.value.length)]
    
    // 如果这个随机词有近义词就用它的近义词，没有就用它原本的词，附带上这个词的中文意思
    const fakeText = randomFallback.synonym || randomFallback.word
    const fakeMeaning = randomFallback.meaning
    
    // 确保没有抽到重复的文本
    const isDuplicate = optionsPool.find(opt => opt.text === fakeText)
    
    // 如果不是重复的，且不是空字符串，就加进选项池
    if (!isDuplicate && fakeText) {
      optionsPool.push({ text: fakeText, meaning: fakeMeaning })
    }
  }
  
  currentOptions.value = shuffleArray(optionsPool)
  speak(q.word)
}

const handleSelect = (optionText) => {
  selectedOption.value = optionText
  hasAnswered.value = true
  isCorrect.value = (optionText === currentQuestion.value.synonym)
  if (isCorrect.value) score.value++
  speak(optionText)
}

const getButtonType = (optionText) => {
  if (!hasAnswered.value) return 'default'
  if (optionText === currentQuestion.value.synonym) return 'success'
  if (optionText === selectedOption.value && !isCorrect.value) return 'danger'
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
  height: auto;
  min-height: 48px;
  padding: 10px;
}
/* 新增：选项排版样式 */
.option-btn :deep(.van-button__text) {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}
.option-text {
  font-size: 16px;
  font-weight: bold;
}
.option-meaning {
  font-size: 12px;
  color: inherit;
  opacity: 0.8;
  margin-top: 4px;
}
.action-area {
  margin-top: 24px;
}
</style>
