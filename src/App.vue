没问题！我已经在你提供的这段代码基础上，仅仅修改了 updateWrongCount 函数的内部逻辑，加上了云端保存失败时的报错弹窗提示。其他所有代码、排版、功能都 100% 保持原样不变。

你可以直接全选复制以下代码，替换你的 src/App.vue 文件：

xml
<template>
  <div class="app-container">
    <van-nav-bar title="雅思云端特训" style="background-color: #f7f8fa;" />

    <div class="control-panel" v-if="!isPracticing && !isListeningVocab && !isListeningIntensive">
      <van-notice-bar left-icon="info-o" :text="'当前云端词库共有 ' + totalWordsInDB + ' 个单词'" />
      
      <div class="global-actions">
        <van-uploader accept=".csv" :max-count="1" :after-read="handleFileUpload" style="width: 100%;">
          <van-button icon="plus" type="primary" plain block>批量上传词书 (CSV)</van-button>
        </van-uploader>
        <van-button icon="edit" type="primary" plain block style="margin-top: 10px;" @click="showAddDialog = true">
          手动添加单个生词
        </van-button>
      </div>

      <div class="module-card">
        <h3>📖 阅读：同义词替换</h3>
        <!-- 【纯添加】：按钮显示专门的阅读词库数量 -->
        <van-button type="success" block round @click="startPractice('all')" :disabled="readingWordCount === 0">
          开始刷题！(共 {{ readingWordCount }} 词)
        </van-button>
        <van-button type="warning" block round style="margin-top: 15px;" @click="startPractice('reading_wrong')" :disabled="readingWrongCount === 0">
          复习阅读错题本 ({{ readingWrongCount }}个)
        </van-button>
      </div>

      <div class="module-card">
        <h3>🎧 听力：生词听写测试</h3>
        <p class="module-desc">盲听单词拼写，男女声混合，做完生成汇总表</p>
        <!-- 【纯添加】：按钮显示专门的听力词库数量 -->
        <van-button type="primary" block round @click="startListeningVocab('all')" :disabled="listeningWordCount === 0">
          开始听写测试 (共 {{ listeningWordCount }} 词)
        </van-button>
        <van-button type="danger" plain block round style="margin-top: 15px;" @click="startListeningVocab('wrong')" :disabled="listeningWrongCount === 0">
          攻克听力错题本 ({{ listeningWrongCount }}个)
        </van-button>
      </div>

      <div class="module-card">
        <h3>👂 听力：词汇精听</h3>
        <p class="module-desc">随机男女声朗读，辅助记忆原词与释义</p>
        <van-button color="#7232dd" block round @click="startListeningIntensive" :disabled="listeningWordCount === 0">
          进入精听模式
        </van-button>
      </div>
    </div>

    <!-- ==================== 视图区 1：原版阅读特训 ==================== -->
    <div class="content" v-else-if="isPracticing">
      <div class="score-board">
        <span>当前得分: {{ score }}</span>
        <span style="color:#1989fa; cursor:pointer;" @click="isPracticing = false">退出练习</span>
      </div>

      <van-cell-group inset class="question-card" v-if="currentQuestion">
        <div class="word-display">
          <h2>{{ currentQuestion.word }}</h2>
          <van-icon name="volume-o" size="24" @click="speak(currentQuestion.word)" style="color:#1989fa; margin-left: 10px;" />
          <van-icon :name="currentQuestion.reading_wrong_count > 0 ? 'star' : 'star-o'" size="26" :color="currentQuestion.reading_wrong_count > 0 ? '#fadb14' : '#ccc'" style="margin-left: 15px; cursor: pointer;" @click="toggleFav('reading')" />
          <van-icon name="edit" size="22" color="#7232dd" style="margin-left: 15px; cursor: pointer;" @click="openEditDialog" />
          <van-icon name="delete-o" size="22" color="#ee0a24" style="margin-left: 10px; cursor: pointer;" @click="confirmDelete" />
        </div>
        
        <p style="text-align: center; color: #999; margin: 0 0 10px 0; min-height: 20px;">
          <span v-if="hasAnswered">【原词释义】{{ currentQuestion.meaning }}</span>
        </p>

        <p style="text-align: center; color: #666; margin-bottom: 20px; font-weight: bold;">请选择与上面单词意思相近的词</p>

        <div class="options-list">
          <van-button v-for="(option, index) in currentOptions" :key="index" block class="option-btn" :type="getButtonType(option)" @click="handleSelect(option)" :disabled="hasAnswered">
            <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.4;">
              <span>{{ option }}</span>
              <span v-if="hasAnswered" class="option-meaning">{{ getOptionMeaning(option) }}</span>
            </div>
          </van-button>
        </div>
      </van-cell-group>

      <div v-if="hasAnswered" class="action-area">
        <van-notice-bar :text="isCorrect ? '回答正确！🎉' : '回答错误。正确近义词是: ' + currentTargetSynonym" :color="isCorrect ? '#07c160' : '#ee0a24'" :background="isCorrect ? '#e8fbec' : '#ffe1e1'" style="margin-bottom: 15px; border-radius: 8px;" />
        <p style="text-align: center; color: #7232dd; font-size: 14px; margin-bottom: 15px; font-weight: bold;" v-if="currentQuestion.synonym">
          💡 该词的全部同义词: {{ currentQuestion.synonym }}
        </p>
        <van-button type="primary" block round @click="nextQuestion">下一题</van-button>
      </div>
    </div>

    <!-- ==================== 视图区 2：听力生词听写 ==================== -->
    <div class="content" v-else-if="isListeningVocab">
      <div class="score-board">
        <span>已测: {{ dictationCount }} 词</span>
        <span style="color:#1989fa; cursor:pointer;" @click="finishDictation">结束并看汇总</span>
      </div>

      <van-cell-group inset class="question-card" v-if="currentQuestion">
        <div class="word-display" style="justify-content: flex-end; margin-bottom: 10px;">
          <van-icon name="edit" size="22" color="#7232dd" style="margin-right: 15px; cursor: pointer;" @click="openEditDialog" />
          <van-icon name="delete-o" size="22" color="#ee0a24" style="cursor: pointer;" @click="confirmDelete" />
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <van-button icon="play-circle-o" type="primary" size="large" round @click="speakMixed(currentQuestion.word)">播放语音 (男女声混合)</van-button>
        </div>

        <van-field v-model="spellInput" placeholder="请根据发音拼写出该单词..." size="large" input-align="center" :disabled="hasAnswered" />

        <div style="margin-top: 20px;" v-if="!hasAnswered">
          <van-button type="success" block round @click="checkDictation">提交批改</van-button>
        </div>

        <div v-if="hasAnswered" style="margin-top: 20px;">
          <van-notice-bar :text="isCorrect ? '拼写正确！🎉' : '拼写错误。正确拼写是: ' + currentQuestion.word" :color="isCorrect ? '#07c160' : '#ee0a24'" :background="isCorrect ? '#e8fbec' : '#ffe1e1'" style="margin-bottom: 15px; border-radius: 8px;" />
          <p style="text-align: center; color: #666; margin-bottom: 10px;">释义: {{ currentQuestion.meaning }}</p>
          <p style="text-align: center; color: #7232dd; font-size: 13px; margin-bottom: 15px;" v-if="currentQuestion.synonym">
            💡 听写容错备用词: {{ currentQuestion.synonym }}
          </p>
          <van-button type="primary" block round @click="nextDictation">下一题</van-button>
        </div>
      </van-cell-group>
    </div>

    <!-- ==================== 视图区 3：听力精听 ==================== -->
    <div class="content" v-else-if="isListeningIntensive">
      <div class="score-board">
        <span>精听模式</span>
        <span style="color:#1989fa; cursor:pointer;" @click="isListeningIntensive = false">退出精听</span>
      </div>

      <van-cell-group inset class="question-card" v-if="currentQuestion">
        <div class="word-display" style="flex-direction: column;">
          <div style="width: 100%; display: flex; justify-content: flex-end; margin-bottom: 10px;">
            <van-icon name="edit" size="22" color="#7232dd" style="margin-right: 15px; cursor: pointer;" @click="openEditDialog" />
            <van-icon name="delete-o" size="22" color="#ee0a24" style="cursor: pointer;" @click="confirmDelete" />
          </div>

          <van-button icon="play-circle" type="primary" size="large" round @click="speakMixed(currentQuestion.word)" style="margin-bottom: 20px;">
            听音频
          </van-button>
          
          <div v-if="showIntensiveText" style="text-align: center;">
            <h2 style="margin: 10px 0;">{{ currentQuestion.word }}</h2>
            <p style="color: #666;">{{ currentQuestion.meaning }}</p>
            <p style="color: #7232dd; font-size: 14px;" v-if="currentQuestion.synonym">同义词: {{ currentQuestion.synonym }}</p>
          </div>
          
          <div style="display: flex; gap: 10px; width: 100%; margin-top: 20px;">
            <van-button type="warning" block plain @click="showIntensiveText = !showIntensiveText">
              {{ showIntensiveText ? '隐藏单词' : '查看单词' }}
            </van-button>
            <van-button type="success" block @click="nextDictation(true)">下一首</van-button>
          </div>
        </div>
      </van-cell-group>
    </div>

    <!-- 弹窗部分 -->
    <van-dialog v-model:show="showAddDialog" title="手动添加生词" show-cancel-button @confirm="submitNewWord">
      <van-field v-model="newWordForm.word" label="单词" placeholder="必填" required />
      <van-field v-model="newWordForm.meaning" label="中文释义" placeholder="必填" required />
      <van-field v-model="newWordForm.synonym" label="同义词" placeholder="多个用英文逗号分隔" />
      <!-- 【纯添加】：让用户必须选择这个词属于阅读还是听力 -->
      <van-radio-group v-model="newWordForm.category" direction="horizontal" style="padding: 10px 16px;">
        <van-radio name="reading">阅读词</van-radio>
        <van-radio name="listening">听力词</van-radio>
      </van-radio-group>
    </van-dialog>

    <van-dialog v-model:show="showEditDialog" title="修改单词" show-cancel-button @confirm="submitEditWord">
      <van-field v-model="editWordForm.word" label="单词" required />
      <van-field v-model="editWordForm.meaning" label="中文释义" required />
      <van-field v-model="editWordForm.synonym" label="同义词" placeholder="可填入复数/变体作容错" />
      <!-- 【纯添加】：修改时也可以更改分类 -->
      <van-radio-group v-model="editWordForm.category" direction="horizontal" style="padding: 10px 16px;">
        <van-radio name="reading">阅读词</van-radio>
        <van-radio name="listening">听力词</van-radio>
      </van-radio-group>
    </van-dialog>

    <van-dialog v-model:show="showSummaryDialog" title="本次听写汇总" confirm-button-text="我知道了">
      <div style="padding: 16px; max-height: 60vh; overflow-y: auto;">
        <h4 style="color: #ee0a24; margin-top: 0;">❌ 拼错的生词 (自动加入听力错题本)</h4>
        <div v-if="sessionWrongWords.length === 0" style="color:#999; font-size:14px;">太棒了，全对！</div>
        <div v-for="(w, i) in sessionWrongWords" :key="'w'+i" style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
          <strong>{{ w.word }}</strong> <br>
          <span style="font-size: 12px; color: #666;">释义: {{ w.meaning }}</span>
        </div>
        <h4 style="color: #07c160; margin-top: 20px;">✅ 拼对的单词</h4>
        <div v-if="sessionRightWords.length === 0" style="color:#999; font-size:14px;">继续努力！</div>
        <span v-for="(w, i) in sessionRightWords" :key="'r'+i" style="margin-right: 10px; color: #666;">
          {{ w.word }}
        </span>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { showToast, showLoadingToast, closeToast, showConfirmDialog } from 'vant'
import { supabase } from './supabase'
import Papa from 'papaparse'

const totalWordsInDB = ref(0)
const wordBank = ref([])

const isPracticing = ref(false)
const isListeningVocab = ref(false)
const isListeningIntensive = ref(false)
const showAddDialog = ref(false)
const showSummaryDialog = ref(false)
const showEditDialog = ref(false)

const practiceMode = ref('all') 
const score = ref(0)
const currentQuestion = ref(null)
const currentTargetSynonym = ref('') 
const currentOptions = ref([])
const hasAnswered = ref(false)
const selectedOption = ref(null)
const isCorrect = ref(false)

const spellInput = ref('')
const dictationCount = ref(0)
const sessionWrongWords = ref([])
const sessionRightWords = ref([])
const showIntensiveText = ref(false)
let currentListeningPool = []

const newWordForm = ref({ word: '', meaning: '', synonym: '', category: 'reading' })
const editWordForm = ref({ id: null, word: '', meaning: '', synonym: '', category: 'reading' })

// 【纯添加】：智能分离阅读库和听力库
const readingWords = computed(() => wordBank.value.filter(w => w.category === 'reading'))
const listeningWords = computed(() => wordBank.value.filter(w => w.category === 'listening'))

const readingWordCount = computed(() => readingWords.value.length)
const listeningWordCount = computed(() => listeningWords.value.length)

// 错题本也各自基于自己专属的分类库计算
const readingWrongCount = computed(() => readingWords.value.filter(w => w.reading_wrong_count > 0).length)
const listeningWrongCount = computed(() => listeningWords.value.filter(w => w.listening_wrong_count > 0).length)

let availableVoices = []
window.speechSynthesis.onvoiceschanged = () => {
  availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.includes('en'))
}

const fetchWordsCount = async () => {
  const { data, error } = await supabase.from('words').select('*')
  if (!error && data) {
    wordBank.value = data
    totalWordsInDB.value = data.length
  }
}

const speak = (text) => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

const speakMixed = (text) => {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  if (availableVoices.length > 0) {
    const randomVoice = availableVoices[Math.floor(Math.random() * availableVoices.length)]
    utterance.voice = randomVoice
  }
  window.speechSynthesis.speak(utterance)
}

const confirmDelete = () => {
  showConfirmDialog({ title: '确认删除', message: `确定要永久删除单词 "${currentQuestion.value.word}" 吗？` })
    .then(async () => {
      await supabase.from('words').delete().eq('id', currentQuestion.value.id)
      showToast('删除成功！')
      fetchWordsCount()
      if (isPracticing.value) nextQuestion()
      else if (isListeningVocab.value) nextDictation()
      else if (isListeningIntensive.value) nextDictation(true)
    }).catch(() => {})
}

const openEditDialog = () => {
  editWordForm.value = { ...currentQuestion.value }
  if (!editWordForm.value.category) editWordForm.value.category = 'reading'
  showEditDialog.value = true
}

const submitEditWord = async () => {
  const { error } = await supabase.from('words').update({
    word: editWordForm.value.word, 
    meaning: editWordForm.value.meaning, 
    synonym: editWordForm.value.synonym,
    category: editWordForm.value.category
  }).eq('id', editWordForm.value.id)
  
  if (!error) {
    showToast('修改成功')
    Object.assign(currentQuestion.value, editWordForm.value)
    fetchWordsCount()
  } else {
    showToast('修改失败')
  }
}

const submitNewWord = async () => {
  if (!newWordForm.value.word || !newWordForm.value.meaning) {
    showToast('单词和释义为必填项！')
    return
  }
  showLoadingToast({ message: '保存中...', forbidClick: true })
  const { error } = await supabase.from('words').insert([{
    word: newWordForm.value.word.trim(),
    meaning: newWordForm.value.meaning.trim(),
    synonym: newWordForm.value.synonym.trim(),
    category: newWordForm.value.category,
    reading_wrong_count: 0,
    listening_wrong_count: 0
  }])
  closeToast()
  if (error) {
    showToast('添加失败: ' + error.message)
  } else {
    showToast('添加成功！')
    newWordForm.value = { word: '', meaning: '', synonym: '', category: 'reading' }
    fetchWordsCount()
  }
}

const handleFileUpload = (fileObj) => {
  const file = fileObj.file
  showLoadingToast({ message: '正在上传到云端...', forbidClick: true })
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      // 批量上传如果没有指定 category，默认设为 reading
      const rows = results.data.map(row => ({
        ...row,
        category: row.category || 'reading'
      }))
      const { error } = await supabase.from('words').insert(rows)
      closeToast()
      if (error) showToast('上传失败: ' + error.message)
      else { showToast('上传成功！'); fetchWordsCount() }
    }
  })
}

const getRandomSingleWord = (str) => {
  if (!str) return ''
  const words = str.split(',').map(s => s.trim()).filter(Boolean)
  if (words.length === 0) return ''
  return words[Math.floor(Math.random() * words.length)]
}

// 【纯修改】：加上了数据库写入失败的报错弹窗提示
const updateWrongCount = async (wordId, newCount, type = 'reading') => {
  const field = type === 'reading' ? 'reading_wrong_count' : 'listening_wrong_count'
  const { error } = await supabase.from('words').update({ [field]: newCount }).eq('id', wordId)
  
  if (error) {
    showToast({
      message: '云端保存失败: ' + error.message,
      type: 'fail',
      duration: 4000
    })
  } else {
    const idx = wordBank.value.findIndex(w => w.id === wordId)
    if (idx > -1) wordBank.value[idx][field] = newCount
  }
}

const toggleFav = (type) => {
  const q = currentQuestion.value
  const field = type === 'reading' ? 'reading_wrong_count' : 'listening_wrong_count'
  const currentCount = q[field] || 0
  const newCount = currentCount > 0 ? 0 : 1 
  q[field] = newCount
  updateWrongCount(q.id, newCount, type)
}

const startPractice = (mode) => {
  practiceMode.value = mode
  // 【纯添加】：阅读模式只从 readingWords 里抽题
  const pool = mode === 'reading_wrong' ? readingWords.value.filter(w => w.reading_wrong_count > 0) : readingWords.value
  if (pool.length < 4) { showToast(`当前模式下阅读词库太少（需至少4个词）！`); return }
  isPracticing.value = true
  score.value = 0
  nextQuestion()
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
  // 【纯添加】：阅读模式只从 readingWords 里抽题
  const pool = practiceMode.value === 'reading_wrong' ? readingWords.value.filter(w => w.reading_wrong_count > 0) : readingWords.value
  const randomIndex = Math.floor(Math.random() * pool.length)
  const q = pool[randomIndex]
  currentQuestion.value = q
  currentTargetSynonym.value = getRandomSingleWord(q.synonym)
  
  let options = [currentTargetSynonym.value].filter(Boolean)
  while (options.length < 4) {
    // 【纯添加】：假选项也只从 readingWords 里抽
    const randomFallback = readingWords.value[Math.floor(Math.random() * readingWords.value.length)]
    const fakeOption = Math.random() > 0.5 ? getRandomSingleWord(randomFallback.synonym) : getRandomSingleWord(randomFallback.antonym)
    if (fakeOption && !options.includes(fakeOption)) options.push(fakeOption)
  }
  currentOptions.value = shuffleArray(options)
  speak(q.word)
}

const handleSelect = (option) => {
  selectedOption.value = option
  hasAnswered.value = true
  isCorrect.value = (option === currentTargetSynonym.value)
  if (isCorrect.value) { score.value++ } 
  else {
    const currentCount = currentQuestion.value.reading_wrong_count || 0
    currentQuestion.value.reading_wrong_count = currentCount + 1
    updateWrongCount(currentQuestion.value.id, currentCount + 1, 'reading')
  }
  speak(option)
}

const getOptionMeaning = (opt) => {
  const found = wordBank.value.find(w => (w.synonym && w.synonym.includes(opt)) || (w.antonym && w.antonym.includes(opt)) || w.word === opt)
  return found ? found.meaning : ''
}

const getButtonType = (option) => {
  if (!hasAnswered.value) return 'default'
  if (option === currentTargetSynonym.value) return 'success'
  if (option === selectedOption.value && !isCorrect.value) return 'danger'
  return 'default'
}

const startListeningVocab = (mode) => {
  // 【纯添加】：听力听写只从 listeningWords 里抽题
  currentListeningPool = mode === 'wrong' ? listeningWords.value.filter(w => w.listening_wrong_count > 0) : listeningWords.value
  if (currentListeningPool.length === 0) { showToast('该模式下没有听力单词'); return }
  
  isListeningVocab.value = true
  dictationCount.value = 0
  sessionWrongWords.value = []
  sessionRightWords.value = []
  nextDictation()
}

const nextDictation = (isIntensive = false) => {
  hasAnswered.value = false
  spellInput.value = ''
  showIntensiveText.value = false
  
  const randomIndex = Math.floor(Math.random() * currentListeningPool.length)
  currentQuestion.value = currentListeningPool[randomIndex]
  
  setTimeout(() => { speakMixed(currentQuestion.value.word) }, 300)
}

const checkDictation = () => {
  if (!spellInput.value.trim()) { showToast('请输入拼写！'); return }
  
  hasAnswered.value = true
  dictationCount.value++
  
  const userAns = spellInput.value.trim().toLowerCase()
  const correctAns = currentQuestion.value.word.trim().toLowerCase()
  
  const validSynonyms = currentQuestion.value.synonym 
    ? currentQuestion.value.synonym.toLowerCase().split(',').map(s=>s.trim()) 
    : []
  
  isCorrect.value = (userAns === correctAns || validSynonyms.includes(userAns))
  
  if (isCorrect.value) {
    sessionRightWords.value.push(currentQuestion.value)
  } else {
    sessionWrongWords.value.push(currentQuestion.value)
    const currentCount = currentQuestion.value.listening_wrong_count || 0
    currentQuestion.value.listening_wrong_count = currentCount + 1
    updateWrongCount(currentQuestion.value.id, currentCount + 1, 'listening')
  }
}

const finishDictation = () => {
  isListeningVocab.value = false
  showSummaryDialog.value = true
}

const startListeningIntensive = () => {
  // 【纯添加】：听力精听只从 listeningWords 里抽题
  currentListeningPool = listeningWords.value
  if (currentListeningPool.length === 0) { showToast('当前没有听力单词'); return }
  isListeningIntensive.value = true
  nextDictation(true)
}

onMounted(() => {
  fetchWordsCount()
  window.speechSynthesis.getVoices()
})
</script>

<style scoped>
.app-container { min-height: 100vh; background-color: #f2f3f5; padding-bottom: 20px;}
.control-panel, .content { padding: 16px; }
.global-actions { background: white; padding: 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.module-card { background: white; padding: 20px 16px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.module-card h3 { margin: 0 0 10px 0; color: #333; font-size: 18px; }
.module-desc { font-size: 13px; color: #888; margin-bottom: 15px; }

.score-board { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; background: white; padding: 12px 16px; border-radius: 8px;}
.question-card { padding: 24px 16px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
.word-display { display: flex; justify-content: center; align-items: center; margin-bottom: 5px; }
.word-display h2 { margin: 0; font-size: 28px; color: #333; }
.options-list { display: flex; flex-direction: column; gap: 12px; }
.option-btn { border-radius: 8px; font-size: 16px; min-height: 48px; height: auto; padding: 10px 0; }
.option-meaning { font-size: 12px; opacity: 0.8; margin-top: 2px; font-weight: normal; }
.action-area { margin-top: 24px; }
</style>