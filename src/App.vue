<template>
  <div class="app-container">
    <van-nav-bar :title="activeTab === 0 ? 'IELTS-ALLWORDS'" style="background-color: #f7f8fa;" />

    <!-- ==================== 模块一：阅读特训 (Reading) ==================== -->
    <div v-show="activeTab === 0" style="padding-bottom: 60px;">
      <!-- 控制台 -->
      <div class="control-panel" v-if="!isPracticing">
        <van-notice-bar left-icon="info-o" :text="'当前阅读词库共有 ' + readingWords.length + ' 个单词'" />
        <div style="margin: 20px 16px;">
          <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload">
            <van-button icon="description" type="primary" plain block>上传阅读词书 (CSV格式)</van-button>
          </van-uploader>
          <van-button icon="plus" type="primary" plain block style="margin-top: 15px;" @click="showAddDialog = true">
            手动录入阅读单词
          </van-button>
          <van-button type="success" block round style="margin-top: 30px;" @click="startPractice" :disabled="readingWords.length === 0">
            开始阅读刷题！
          </van-button>
        </div>
      </div>

      <!-- 刷题页面 -->
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
              v-for="(optionObj, index) in currentOptions" :key="index" block class="option-btn"
              :type="getButtonType(optionObj.text)" @click="handleSelect(optionObj.text)" :disabled="hasAnswered"
            >
              <span class="option-text">{{ optionObj.text }}</span>
              <span v-if="hasAnswered" class="option-meaning">{{ optionObj.meaning }}</span>
            </van-button>
          </div>
        </van-cell-group>

        <div v-if="hasAnswered" class="action-area" style="padding: 16px;">
          <van-notice-bar 
            :text="isCorrect ? '回答正确！🎉' : '回答错误。正确选项是: ' + (currentQuestion.synonym || currentQuestion.word)" 
            :color="isCorrect ? '#07c160' : '#ee0a24'" :background="isCorrect ? '#e8fbec' : '#ffe1e1'"
            style="margin-bottom: 20px; border-radius: 8px;"
          />
          <van-button type="primary" block round @click="nextQuestion">下一题</van-button>
        </div>
      </div>
    </div>

    <!-- ==================== 模块二：听力默写 (Listening) ==================== -->
    <div v-show="activeTab === 1" style="padding-bottom: 60px;">
      <!-- 听力控制台与模块列表 -->
      <div v-if="!isListeningMode">
        <van-notice-bar left-icon="service-o" :text="'当前听力词库共有 ' + listeningWords.length + ' 个单词'" />
        <div style="margin: 20px 16px;">
          <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload">
            <van-button icon="description" type="success" plain block>上传听力词书 (CSV格式)</van-button>
          </van-uploader>
          <van-button icon="plus" type="success" plain block style="margin-top: 15px;" @click="showAddDialog = true">
            手动录入听力单词
          </van-button>
        </div>

        <div style="padding: 0 16px; margin-top: 20px;">
          <h3 style="color: #333; margin-bottom: 10px;">听写任务模块 (每2天一组)</h3>
          <van-cell-group inset style="margin:0;">
            <van-cell v-if="listeningModules.length === 0" title="暂无听写任务" />
            <van-cell 
              v-for="(mod, index) in listeningModules" 
              :key="index" 
              :title="'Module ' + (index + 1)" 
              :label="mod.dateRange + ' | 共 ' + mod.words.length + ' 词'" 
              is-link 
              @click="startListeningModule(mod.words)"
            />
          </van-cell-group>
        </div>
      </div>

      <!-- 听写进行中 -->
      <div class="content" v-else-if="isListeningPracticing">
        <div class="score-board">
          <span>进度: {{ listeningIndex + 1 }} / {{ listeningCurrentModule.length }}</span>
          <span style="color:#1989fa; cursor:pointer;" @click="exitListening">放弃测验</span>
        </div>

        <van-cell-group inset class="question-card" style="text-align: center;">
          <div style="padding: 40px 0;">
            <van-icon name="play-circle" size="64" color="#07c160" @click="speak(currentListeningWord.word)" style="cursor: pointer;" />
            <p style="color: #666; margin-top: 15px;">点击播放按钮听发音</p>
          </div>
          
          <van-field 
            v-model="listeningInput" 
            placeholder="请在此拼写你听到的单词..." 
            input-align="center" 
            size="large"
            style="background: #f7f8fa; border-radius: 8px; margin-bottom: 20px;"
            @keyup.enter="nextListeningWord"
          />
          <van-button type="success" block round @click="nextListeningWord">Next (下一词)</van-button>
        </van-cell-group>
      </div>

      <!-- 听写成绩单 -->
      <div class="content" v-else-if="isListeningFinished">
        <div style="text-align: center; padding: 20px 0;">
          <van-icon name="checked" size="64" color="#07c160" />
          <h2 style="margin: 10px 0;">听写完成！</h2>
          <p style="color: #666; font-size: 18px;">正确率: <strong style="color: #07c160;">{{ listeningAccuracy }}%</strong></p>
        </div>

        <van-cell-group inset title="错题复盘">
          <van-cell v-if="listeningMistakes.length === 0" title="太棒了！全对！" />
          <div v-for="(item, index) in listeningMistakes" :key="index" style="padding: 10px 16px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; font-size: 16px; color: #ee0a24;">你的拼写: {{ item.userInput || '(留空)' }}</div>
            <div style="color: #07c160; margin-top: 5px;">正确拼写: {{ item.correctWord }}</div>
            <div style="color: #999; font-size: 13px; margin-top: 5px;">释义: {{ item.meaning }}</div>
          </div>
        </van-cell-group>

        <div style="padding: 20px 16px;">
          <van-button type="primary" block round @click="exitListening">返回列表</van-button>
        </div>
      </div>
    </div>

    <!-- 底部 Tab 导航 -->
    <van-tabbar v-model="activeTab" active-color="#1989fa">
      <van-tabbar-item icon="flag-o">阅读特训</van-tabbar-item>
      <van-tabbar-item icon="service-o">听力默写</van-tabbar-item>
    </van-tabbar>

    <!-- 公用录入弹窗 -->
    <van-dialog v-model:show="showAddDialog" :title="activeTab === 0 ? '录入阅读单词' : '录入听力单词'" show-cancel-button @confirm="submitSingleWord">
      <van-cell-group inset style="margin: 15px 0;">
        <van-field v-model="newWordForm.word" label="单词" placeholder="例: resemble" />
        <van-field v-model="newWordForm.meaning" label="意思" placeholder="例: v.像，与……相似" />
        <van-field v-model="newWordForm.synonym" label="近义词" placeholder="多个用 | 隔开" v-if="activeTab === 0" />
      </van-cell-group>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import { supabase } from './supabase'
import Papa from 'papaparse'

// 全局状态
const activeTab = ref(0) // 0: Reading, 1: Listening
const readingWords = ref([])
const listeningWords = ref([])

// 共用录入表单
const showAddDialog = ref(false)
const newWordForm = ref({ word: '', meaning: '', synonym: '' })

// ---------------- 阅读模块状态 ----------------
const isPracticing = ref(false)
const score = ref(0)
const currentQuestion = ref(null)
const currentOptions = ref([])
const hasAnswered = ref(false)
const selectedOption = ref(null)
const isCorrect = ref(false)

// ---------------- 听力模块状态 ----------------
const isListeningMode = ref(false) // 是否进入了听写或结果页
const isListeningPracticing = ref(false)
const isListeningFinished = ref(false)
const listeningCurrentModule = ref([])
const listeningIndex = ref(0)
const listeningInput = ref('')
const listeningResults = ref([])

// 获取数据库并分类
const fetchWordsCount = async () => {
  const { data, error } = await supabase.from('words').select('*').order('created_at', { ascending: true })
  if (!error && data) {
    // 没写分类的默认算 reading
    readingWords.value = data.filter(w => w.category === 'reading' || !w.category)
    listeningWords.value = data.filter(w => w.category === 'listening')
  }
}

// 核心逻辑：自动把听力单词每两天的上传量合成一个 Module
const listeningModules = computed(() => {
  const dateMap = {}
  listeningWords.value.forEach(w => {
    // 提取年月日作为 key
    const d = new Date(w.created_at).toLocaleDateString()
    if (!dateMap[d]) dateMap[d] = []
    dateMap[d].push(w)
  })
  
  const dates = Object.keys(dateMap).sort()
  const modules = []
  
  for (let i = 0; i < dates.length; i += 2) {
    let combinedWords = [...dateMap[dates[i]]]
    let dateStr = dates[i]
    // 尝试把第二天的词合并进来
    if (i + 1 < dates.length) {
      combinedWords = combinedWords.concat(dateMap[dates[i+1]])
      dateStr += ' ~ ' + dates[i+1]
    }
    modules.push({ dateRange: dateStr, words: combinedWords })
  }
  return modules
})

// 公用提交（自动判断当前在哪个 Tab）
const submitSingleWord = async () => {
  if (!newWordForm.value.word || !newWordForm.value.meaning) return showToast('单词和意思不能为空哦！')
  showLoadingToast({ message: '正在保存...', forbidClick: true })
  const category = activeTab.value === 0 ? 'reading' : 'listening'
  const { error } = await supabase.from('words').insert({
    word: newWordForm.value.word, meaning: newWordForm.value.meaning, synonym: newWordForm.value.synonym, category: category
  })
  closeToast()
  if (error) showToast('添加失败')
  else {
    showToast('添加成功！')
    newWordForm.value = { word: '', meaning: '', synonym: '' }
    fetchWordsCount()
  }
}

// 公用上传（自动打标签）
const handleFileUpload = (fileObj) => {
  const file = fileObj.file
  showLoadingToast({ message: '正在上传...', forbidClick: true })
  const category = activeTab.value === 0 ? 'reading' : 'listening'
  
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data.map(row => ({ ...row, category: category }))
      const { error } = await supabase.from('words').insert(rows)
      closeToast()
      if (error) showToast('上传失败: ' + error.message)
      else { showToast('上传成功！'); fetchWordsCount() }
    }
  })
}

// 发音
const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

// ---------------- 阅读功能函数 ----------------
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const startPractice = () => {
  if (readingWords.value.length < 4) return showToast('阅读词库至少需要4个单词！')
  isPracticing.value = true; score.value = 0; nextQuestion()
}

const nextQuestion = () => {
  hasAnswered.value = false; selectedOption.value = null
  const q = readingWords.value[Math.floor(Math.random() * readingWords.value.length)]
  currentQuestion.value = q
  
  let optionsPool = []
  const correctText = q.synonym || q.word
  optionsPool.push({ text: correctText, meaning: q.meaning })

  while (optionsPool.length < 4) {
    const fallback = readingWords.value[Math.floor(Math.random() * readingWords.value.length)]
    const fakeText = fallback.synonym || fallback.word
    if (!optionsPool.find(opt => opt.text === fakeText) && fakeText) {
      optionsPool.push({ text: fakeText, meaning: fallback.meaning })
    }
  }
  currentOptions.value = shuffleArray(optionsPool)
  speak(q.word)
}

const handleSelect = (optionText) => {
  selectedOption.value = optionText; hasAnswered.value = true
  isCorrect.value = (optionText === (currentQuestion.value.synonym || currentQuestion.value.word))
  if (isCorrect.value) score.value++
  speak(optionText)
}

const getButtonType = (optionText) => {
  if (!hasAnswered.value) return 'default'
  if (optionText === (currentQuestion.value.synonym || currentQuestion.value.word)) return 'success'
  if (optionText === selectedOption.value && !isCorrect.value) return 'danger'
  return 'default'
}

// ---------------- 听力功能函数 ----------------
const currentListeningWord = computed(() => listeningCurrentModule.value[listeningIndex.value])

const startListeningModule = (words) => {
  listeningCurrentModule.value = shuffleArray([...words]) // 打乱顺序测验
  isListeningMode.value = true
  isListeningPracticing.value = true
  isListeningFinished.value = false
  listeningIndex.value = 0
  listeningResults.value = []
  listeningInput.value = ''
  setTimeout(() => speak(currentListeningWord.value.word), 500)
}

const nextListeningWord = () => {
  // 记录用户答案
  listeningResults.value.push({
    correctWord: currentListeningWord.value.word,
    userInput: listeningInput.value.trim().toLowerCase(),
    meaning: currentListeningWord.value.meaning,
    isRight: listeningInput.value.trim().toLowerCase() === currentListeningWord.value.word.toLowerCase()
  })
  
  listeningIndex.value++
  listeningInput.value = ''
  
  if (listeningIndex.value >= listeningCurrentModule.value.length) {
    // 听写结束
    isListeningPracticing.value = false
    isListeningFinished.value = true
  } else {
    // 播放下一个
    speak(currentListeningWord.value.word)
  }
}

const listeningMistakes = computed(() => listeningResults.value.filter(r => !r.isRight))
const listeningAccuracy = computed(() => {
  if (listeningResults.value.length === 0) return 0
  const corrects = listeningResults.value.filter(r => r.isRight).length
  return Math.round((corrects / listeningResults.value.length) * 100)
})

const exitListening = () => {
  isListeningMode.value = false
  isListeningPracticing.value = false
  isListeningFinished.value = false
}

onMounted(() => fetchWordsCount())
</script>

<style scoped>
.app-container { min-height: 100vh; background-color: #f2f3f5; }
.control-panel, .content { padding: 16px; }
.score-board { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; }
.question-card { padding: 24px 16px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.word-display { display: flex; justify-content: center; align-items: center; margin-bottom: 5px; }
.word-display h2 { margin: 0; font-size: 28px; color: #333; }
.options-list { display: flex; flex-direction: column; gap: 12px; }
.option-btn { border-radius: 8px; height: auto; min-height: 54px; padding: 8px; }
.option-btn :deep(.van-button__text) { display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.4; }
.option-text { font-size: 16px; font-weight: 500; }
.option-meaning { font-size: 13px; color: #666; margin-top: 4px; }
.van-button--danger .option-meaning, .van-button--success .option-meaning { color: #fff; opacity: 0.9; }
.action-area { margin-top: 24px; }
</style>