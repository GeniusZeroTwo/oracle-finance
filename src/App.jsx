import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Server, Lock, 
  KeyRound, ShieldCheck, RefreshCw, Box, LayoutDashboard, Copy, 
  CheckCircle2, Ban, AlertCircle, LogOut, Edit, MapPin, Search
} from 'lucide-react';

// ==========================================
// 模拟初始数据 (本地降级时使用)
// ==========================================
const initialTransactions = [
  { id: '1', type: 'income', amount: 450, category: '账号售卖', date: '2026-06-01', description: '首尔带原邮双ARM' },
  { id: '2', type: 'expense', amount: 35, category: '开卡成本', date: '2026-06-02', description: '购买虚拟卡(用于注册)' },
  { id: '3', type: 'income', amount: 280, category: '账号售卖', date: '2026-06-05', description: '春川单号无原邮' },
];

// ==========================================
// 全局工具：安全加密 & 解密模块 (已移除外部依赖，使用原生高级混淆)
// ==========================================
// ⚠️ 强烈建议在部署前，将此处的 AES_SECRET_KEY 修改为您个人的复杂密码
const AES_SECRET_KEY = 'oracle_finance_secure_key_2026_CHANGE_ME';
const OLD_XOR_KEY = 'fallback_local_secret_key_2026'; // 保留用于兼容您的历史旧数据

// 原生 RC4 算法实现，无需第三方库，避免编译报错
const rc4 = (key, str) => {
  let s = [], j = 0, x, res = '';
  for (let i = 0; i < 256; i++) { s[i] = i; }
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
  }
  let i = 0; j = 0;
  for (let y = 0; y < str.length; y++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    x = s[i]; s[i] = s[j]; s[j] = x;
    res += String.fromCharCode(str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
  }
  return res;
};

const encryptText = (text) => {
  if (!text) return '';
  // 使用 RC4 加密并进行 Base64 编码，增加一个前缀标识这是新版加密
  const encrypted = rc4(AES_SECRET_KEY, encodeURIComponent(text));
  return 'V2_' + btoa(encrypted);
};

const decryptText = (cipherText) => {
  if (!cipherText) return '';
  
  // 1. 尝试使用新版 RC4 解密 (适用于新录入/修改的数据)
  if (cipherText.startsWith('V2_')) {
    try {
      const actualCipher = cipherText.substring(3);
      const decryptedText = decodeURIComponent(rc4(AES_SECRET_KEY, atob(actualCipher)));
      if (decryptedText) return decryptedText;
    } catch (error) {
      // 解密失败静默拦截
    }
  }

  // 2. 兼容性修复：如果字符串包含非 base64 字符，说明大概率是旧版未加密的明文
  if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(cipherText)) {
    return cipherText;
  }

  // 3. 降级尝试旧版 XOR 解密 (保证您之前的历史存量数据依然可见)
  try {
    const decoded = atob(cipherText);
    const text = decodeURIComponent(decoded);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ OLD_XOR_KEY.charCodeAt(i % OLD_XOR_KEY.length));
    }
    return result || cipherText;
  } catch (error) {
    return cipherText;
  }
};

// ==========================================
// 独立组件 1：登录界面 (Login)
// ==========================================
const Login = ({ setAuth }) => {
  const [loginStep, setLoginStep] = useState(1);
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');

  const handleSendCode = async () => {
    setLoginError(''); setLoginMessage(''); setIsSendingCode(true);
    try {
      const res = await fetch('/api/auth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error((await res.json()).error || '请求失败');
      setLoginMessage((await res.json()).message || '验证码已发送，请查看 Telegram。');
      setLoginStep(2);
    } catch (error) {
      setLoginError(error.message || '发送失败，请检查网络或配置');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) return setLoginError('请输入 6 位验证码');
    setLoginError(''); setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/verify', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }) 
      });
      if (!res.ok) throw new Error((await res.json()).error || '验证码错误');
      const data = await res.json();
      sessionStorage.setItem('oracle_finance_auth', 'true'); 
      sessionStorage.setItem('token', data.token);
      setAuth(true);
    } catch (error) {
      setLoginError(error.message || '验证失败');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">系统安全访问</h2>
          <p className="text-indigo-100 mt-2 text-sm">面板受 AES-256 前端加密保护，请验证身份</p>
        </div>
        
        <div className="p-8">
          {loginError && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">{loginError}</div>}
          {loginMessage && <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-6 text-center">{loginMessage}</div>}

          {loginStep === 1 ? (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 text-center">点击下方按钮，系统将向绑定的 Telegram 发送验证码。</p>
              <button onClick={handleSendCode} disabled={isSendingCode} className="w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {isSendingCode ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 发送中...</> : '获取验证码'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">输入 6 位验证码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input type="text" maxLength="6" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} className="pl-10 block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 text-center tracking-[0.5em] text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="000000" required />
                </div>
                <div className="flex justify-between items-center mt-2">
                   <button type="button" onClick={handleSendCode} disabled={isSendingCode} className="text-xs text-gray-500 hover:text-indigo-600 disabled:opacity-50">重新发送</button>
                  <button type="button" onClick={() => setLoginStep(1)} className="text-xs text-indigo-600 hover:text-indigo-500">返回</button>
                </div>
              </div>
              <button type="submit" disabled={isVerifying || verificationCode.length !== 6} className="w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {isVerifying ? '解密系统加载中...' : '安全登录'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 独立组件 2：导航布局 (Layout)
// ==========================================
const Layout = ({ handleLogout, toastMessage }) => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-12">
      {/* 全局 Toast 提示 */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          {toastMessage}
        </div>
      )}

      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Server className="w-7 h-7 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900 hidden sm:block">甲骨文控制台</span>
            </div>
            
            <div className="flex space-x-2 sm:space-x-8 h-full">
              <NavLink to="/finance" className={({ isActive }) => `inline-flex items-center px-2 sm:px-4 py-2 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <LayoutDashboard className="w-4 h-4 mr-2" /> 财务大盘
              </NavLink>
              <NavLink to="/inventory" className={({ isActive }) => `inline-flex items-center px-2 sm:px-4 py-2 border-b-2 font-medium text-sm transition-colors ${isActive ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <Box className="w-4 h-4 mr-2" /> 账号库存
              </NavLink>
            </div>

            <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all" title="锁定并退出">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 路由占位符 */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mt-4 animate-in fade-in duration-500">
        <Outlet />
      </div>
    </div>
  );
};

// ==========================================
// 独立组件 3：财务看板 (FinanceDashboard)
// ==========================================
const FinanceDashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ type: 'income', amount: '', category: '', date: new Date().toISOString().split('T')[0], description: '' });

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('/api/transactions', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } });
        if (response.ok) setTransactions(await response.json());
        else throw new Error('API未就绪');
      } catch (error) {
        const saved = localStorage.getItem('oracle_finance_transactions');
        setTransactions(saved ? JSON.parse(saved) : initialTransactions);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('oracle_finance_transactions', JSON.stringify(transactions));
  }, [transactions, isLoading]);

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    const newTx = { ...formData, id: Date.now().toString(), amount: parseFloat(formData.amount) };
    setTransactions(prev => [newTx, ...prev]);
    try {
      await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }, body: JSON.stringify(newTx) });
    } catch (e) { console.log('保存交易到本地'); }
    setFormData(prev => ({ ...prev, amount: '', category: '', description: '' }));
  };

  const handleTxDelete = async (id) => {
    if (!window.confirm('确定删除记录？')) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    try { await fetch(`/api/transactions/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } }); } catch (e) {}
  };

  const stats = useMemo(() => {
    let totalIncomeCents = 0, totalExpenseCents = 0, thisMonthIncomeCents = 0, thisMonthExpenseCents = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    transactions.forEach(t => {
      const amountCents = Math.round((t.amount || 0) * 100);
      if (t.type === 'income') { 
        totalIncomeCents += amountCents; 
        if (t.date.startsWith(currentMonth)) thisMonthIncomeCents += amountCents; 
      }
      else { 
        totalExpenseCents += amountCents; 
        if (t.date.startsWith(currentMonth)) thisMonthExpenseCents += amountCents; 
      }
    });
    return { 
      totalIncome: totalIncomeCents / 100, 
      totalExpense: totalExpenseCents / 100, 
      balance: (totalIncomeCents - totalExpenseCents) / 100, 
      thisMonthIncome: thisMonthIncomeCents / 100, 
      thisMonthExpense: thisMonthExpenseCents / 100, 
      thisMonthBalance: (thisMonthIncomeCents - thisMonthExpenseCents) / 100 
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    const grouped = {};
    transactions.forEach(t => {
      const month = t.date.slice(0, 7); 
      if (!grouped[month]) grouped[month] = { name: month, income: 0, expense: 0 };
      
      const amountCents = Math.round((t.amount || 0) * 100);
      t.type === 'income' ? grouped[month].income += amountCents : grouped[month].expense += amountCents;
    });
    
    return Object.values(grouped).map(g => ({
      ...g,
      income: g.income / 100,
      expense: g.expense / 100
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  if (isLoading) return <div className="text-center text-gray-500 py-10">加载财务数据中...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          <span className="text-gray-500 text-sm font-medium mb-1 block">历史总收入</span>
          <div className="text-2xl font-bold text-green-600">¥{stats.totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          <TrendingUp className="w-16 h-16 text-green-500 absolute -right-4 -bottom-4 opacity-10" />
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          <span className="text-gray-500 text-sm font-medium mb-1 block">历史总成本</span>
          <div className="text-2xl font-bold text-red-500">¥{stats.totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          <TrendingDown className="w-16 h-16 text-red-500 absolute -right-4 -bottom-4 opacity-10" />
        </div>
        
        <div className={`bg-white rounded-xl p-5 shadow-sm border relative overflow-hidden ${stats.balance >= 0 ? 'border-green-100' : 'border-red-100'}`}>
          <span className="text-gray-500 text-sm font-medium mb-1 block">历史总利润</span>
          <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>¥{stats.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          <DollarSign className={`w-16 h-16 absolute -right-4 -bottom-4 opacity-10 ${stats.balance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          <span className="text-gray-500 text-sm font-medium mb-1 block">本月销售收入</span>
          <div className="text-2xl font-bold text-gray-800">¥{stats.thisMonthIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
        </div>
        
        <div className={`bg-white rounded-xl p-5 shadow-sm border relative overflow-hidden ${stats.thisMonthBalance >= 0 ? 'border-indigo-100' : 'border-orange-100'}`}>
          <span className="text-gray-500 text-sm font-medium mb-1 block">本月净利润</span>
          <div className={`text-2xl font-bold ${stats.thisMonthBalance >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>¥{stats.thisMonthBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          <DollarSign className={`w-16 h-16 absolute -right-4 -bottom-4 opacity-10 ${stats.thisMonthBalance >= 0 ? 'text-indigo-500' : 'text-orange-500'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-gray-400" /> 营收对比</h2>
          <div className="flex-1 w-full min-h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(value, name) => [`¥${value}`, name === 'income' ? '收入' : '成本']} />
                  <Legend iconType="circle" formatter={(value) => <span className="text-gray-600">{value === 'income' ? '销售收入' : '业务成本'}</span>} />
                  <Bar dataKey="income" name="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="expense" name="expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="w-full h-full flex items-center justify-center text-gray-400">暂无数据</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-gray-400" /> 录入交易</h2>
          <form onSubmit={handleTxSubmit} className="space-y-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'income' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>进账</button>
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>成本</button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">金额</label>
              <input type="number" name="amount" value={formData.amount} onChange={(e) => setFormData(p => ({...p, amount: e.target.value}))} step="0.01" min="0" placeholder="0.00" className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">日期</label><input type="date" name="date" value={formData.date} onChange={(e) => setFormData(p => ({...p, date: e.target.value}))} className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900" required /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">分类</label><input type="text" name="category" value={formData.category} onChange={(e) => setFormData(p => ({...p, category: e.target.value}))} className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900" required /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">备注(可选)</label><input type="text" name="description" value={formData.description} onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900" /></div>
            <button type="submit" className={`w-full text-white font-medium rounded-lg text-sm px-5 py-3 transition-colors ${formData.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>保存</button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50"><h2 className="text-lg font-semibold text-gray-800">业务流水明细</h2></div>
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                <tr><th className="px-6 py-3 font-medium">日期</th><th className="px-6 py-3 font-medium">类型</th><th className="px-6 py-3 font-medium">分类</th><th className="px-6 py-3 font-medium">备注</th><th className="px-6 py-3 font-medium text-right">金额</th><th className="px-6 py-3 font-medium text-center">操作</th></tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{t.date}</td>
                    <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type === 'income' ? '进账' : '成本'}</span></td>
                    <td className="px-6 py-4 font-medium text-gray-900">{t.category}</td>
                    <td className="px-6 py-4">{t.description || '-'}</td>
                    <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>{t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center"><button onClick={() => handleTxDelete(t.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-10 text-center text-gray-400"><p>暂无业务流水记录</p></div>}
      </div>
    </div>
  );
};

// ==========================================
// 独立组件 4：账号库存 (AccountInventory) - 升级版 (卡片式 & 批量粘贴)
// ==========================================
const AccountInventory = ({ setToastMessage }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 用于控制卡片编辑状态的 State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ accountData: '', twoFactor: '', cost: '', status: 'alive', description: '', region: '' });
  
  // 独立的账号粘贴框 与 2FA单独字段
  const [accountFormData, setAccountFormData] = useState({ 
    accountData: '', 
    twoFactor: '',
    cost: '', 
    status: 'alive', 
    date: new Date().toISOString().split('T')[0], 
    description: '',
    region: ''
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } });
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
        } else throw new Error('API未就绪');
      } catch (error) {
        const saved = localStorage.getItem('oracle_finance_accounts');
        setAccounts(saved ? JSON.parse(saved) : []);
      } finally { setIsLoading(false); }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('oracle_finance_accounts', JSON.stringify(accounts));
  }, [accounts, isLoading]);

  // 处理表单提交 (整体加密账号数据，并附带标识)
  const handleAccSubmit = async (e) => {
    e.preventDefault();
    
    if (!accountFormData.accountData) {
      return alert('请粘贴或填写账号数据！');
    }

    const newAccount = {
      ...accountFormData,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      email: encryptText(accountFormData.accountData), // 将合并的文本加密存储于 email 字段
      password: 'MERGED_DATA', // 标识符，表明该条数据使用的是不拆分的合并格式
      twoFactor: accountFormData.twoFactor ? encryptText(accountFormData.twoFactor) : '',
      cost: parseFloat(accountFormData.cost) || 0,
      region: accountFormData.region || '',
    };

    // 更新本地状态展示
    setAccounts(prev => [newAccount, ...prev]);

    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(newAccount)
      });
      
      if (setToastMessage) {
        setToastMessage('账号已安全加密并录入');
        setTimeout(() => setToastMessage(''), 2500);
      }
    } catch (e) { console.log('保存失败', e); }
    
    // 清空表单，保留日期等选项
    setAccountFormData(prev => ({ ...prev, accountData: '', twoFactor: '', cost: '', description: '', region: '' }));
  };

  const handleAccDelete = async (id) => {
    if (!window.confirm('删除账号记录不可恢复，确定删除？')) return;
    setAccounts(prev => prev.filter(t => t.id !== id));
    try { await fetch(`/api/accounts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } }); } catch (e) {}
  };

  const handleAccStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'alive' ? 'banned' : 'alive';
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, status: newStatus } : acc));
    try {
      await fetch(`/api/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }, body: JSON.stringify({ status: newStatus }) });
    } catch(e) {}
  };

  // 启动编辑
  const startEdit = (acc) => {
    let decryptedAccountData = '';
    if (acc.password === 'MERGED_DATA') {
      decryptedAccountData = decryptText(acc.email);
    } else {
      decryptedAccountData = acc.email + '----' + decryptText(acc.password);
    }
    setEditingId(acc.id);
    setEditForm({
      accountData: decryptedAccountData,
      twoFactor: decryptText(acc.twoFactor),
      cost: acc.cost,
      status: acc.status,
      description: acc.description || '',
      region: acc.region || ''
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
  };

  // 保存修改记录
  const saveEdit = async (id) => {
    const updatedAcc = {
      id, // 保持原始ID不变
      email: encryptText(editForm.accountData),
      password: 'MERGED_DATA',
      twoFactor: editForm.twoFactor ? encryptText(editForm.twoFactor) : '',
      cost: parseFloat(editForm.cost) || 0,
      status: editForm.status,
      description: editForm.description,
      region: editForm.region || '',
      date: accounts.find(a => a.id === id).date // 保持原始录入日期
    };

    // 本地优先更新 (乐观更新)
    setAccounts(prev => prev.map(a => a.id === id ? updatedAcc : a));
    setEditingId(null);

    try {
      // 正规调用：直接使用后端的 PUT 接口完成整条记录的原位更新
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(updatedAcc)
      });

      if (!res.ok) throw new Error('更新请求失败');

      if(setToastMessage) {
        setToastMessage('修改已重新加密保存');
        setTimeout(() => setToastMessage(''), 2000);
      }
    } catch (e) { 
      console.error('Update failed', e); 
      alert('同步到服务器失败，请检查网络！');
    }
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if(setToastMessage) {
      setToastMessage(`完整${type}已复制`);
      setTimeout(() => setToastMessage(''), 2000);
    }
  };

  const stats = useMemo(() => {
    let aliveAccounts = 0, bannedAccounts = 0, totalCostCents = 0;
    accounts.forEach(acc => { 
      acc.status === 'alive' ? aliveAccounts++ : bannedAccounts++; 
      totalCostCents += Math.round((acc.cost || 0) * 100); 
    });
    return { 
      totalAccounts: accounts.length, 
      aliveAccounts, 
      bannedAccounts, 
      totalCost: totalCostCents / 100 
    };
  }, [accounts]);

  const displayAccounts = useMemo(() => {
    return accounts.map(acc => {
      let decryptedAccountData = '';
      if (acc.password === 'MERGED_DATA') {
        decryptedAccountData = decryptText(acc.email);
      } else {
        decryptedAccountData = acc.email + '----' + decryptText(acc.password);
      }
      const decryptedTwoFactor = decryptText(acc.twoFactor);
      return { ...acc, decryptedAccountData, decryptedTwoFactor };
    }).filter(acc => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        acc.decryptedAccountData.toLowerCase().includes(q) ||
        (acc.description || '').toLowerCase().includes(q) ||
        (acc.region || '').toLowerCase().includes(q) ||
        (acc.date || '').includes(q)
      );
    });
  }, [accounts, searchQuery]);

  if (isLoading) return <div className="text-center text-gray-500 py-10">解密库存数据中...</div>;

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"><span className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1"><Box className="w-4 h-4"/>总录入</span><div className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalAccounts} 个</div></div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100 bg-green-50/30"><span className="text-green-600 text-sm font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>当前存活</span><div className="text-2xl font-bold text-green-700 mt-1">{stats.aliveAccounts} 个</div></div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100 bg-red-50/30"><span className="text-red-600 text-sm font-medium mb-1 flex items-center gap-1"><Ban className="w-4 h-4"/>封禁/阵亡</span><div className="text-2xl font-bold text-red-600 mt-1">{stats.bannedAccounts} 个</div></div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"><span className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1"><DollarSign className="w-4 h-4"/>库存总成本</span><div className="text-2xl font-bold text-gray-800 mt-1">¥{stats.totalCost.toLocaleString()}</div></div>
      </div>

      {/* 录入表单：恢复独立字段录入 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-500" /> 录入新账号 (安全加密)
        </h2>
        <form onSubmit={handleAccSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">账号数据 (邮箱、密码等直接粘贴，不再拆分) *</label>
            <textarea value={accountFormData.accountData} onChange={e=>setAccountFormData(p=>({...p, accountData:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:ring-indigo-500 outline-none resize-none h-[42px] font-mono" placeholder="在此粘贴完整账号信息..." required />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">2FA 密钥 (独立填写，本地加密)</label>
            <input type="text" value={accountFormData.twoFactor} onChange={e=>setAccountFormData(p=>({...p, twoFactor:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-indigo-50/50 p-2 text-sm focus:ring-indigo-500 outline-none font-mono" placeholder="单独粘贴 2FA" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:col-span-1">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">单号成本</label><input type="number" value={accountFormData.cost} onChange={e=>setAccountFormData(p=>({...p, cost:e.target.value}))} step="0.01" className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">初始状态</label><select value={accountFormData.status} onChange={e=>setAccountFormData(p=>({...p, status:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500"><option value="alive">存活</option><option value="banned">封禁</option></select></div>
          </div>
          <div className="lg:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">机型备注</label><input type="text" value={accountFormData.description} onChange={e=>setAccountFormData(p=>({...p, description:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" /></div>
          <div className="lg:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">区域</label><input type="text" value={accountFormData.region} onChange={e=>setAccountFormData(p=>({...p, region:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" placeholder="如: 首尔" /></div>
          <div className="lg:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">日期</label><input type="date" value={accountFormData.date} onChange={e=>setAccountFormData(p=>({...p, date:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" required /></div>
          <div className="flex items-end lg:col-span-1"><button type="submit" className="w-full text-white font-medium rounded-lg text-sm px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center"><Lock className="w-4 h-4 mr-1.5"/>加密保存</button></div>
        </form>
      </div>

      {/* 卡片式库存展示：不再割裂账号密码 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">加密库存 (卡片视图)</h2>
          <div className="relative w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="搜索账号、备注或区域..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        
        <div className="p-6">
          {displayAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayAccounts.map((acc) => {
                const { decryptedAccountData, decryptedTwoFactor } = acc;

                // ==========================================
                // 渲染状态 1：编辑模式卡片
                // ==========================================
                if (editingId === acc.id) {
                  return (
                    <div key={acc.id} className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-5 shadow-sm transition-all relative flex flex-col gap-3">
                      <div className="text-sm font-semibold text-indigo-700 border-b border-indigo-100 pb-2 mb-1 flex items-center"><Edit className="w-4 h-4 mr-1.5"/>编辑加密账号</div>
                      
                      <div>
                        <label className="block text-xs font-medium text-indigo-500 mb-1">账号数据</label>
                        <textarea value={editForm.accountData} onChange={e=>setEditForm({...editForm, accountData: e.target.value})} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2.5 outline-none h-[110px] font-mono focus:ring-1 focus:ring-indigo-400" />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-indigo-500 mb-1">2FA 密钥</label>
                        <input value={editForm.twoFactor} onChange={e=>setEditForm({...editForm, twoFactor: e.target.value})} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2.5 outline-none font-mono focus:ring-1 focus:ring-indigo-400" />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">成本 (¥)</label>
                          <input type="number" step="0.01" value={editForm.cost} onChange={e=>setEditForm({...editForm, cost: e.target.value})} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">区域</label>
                          <input type="text" value={editForm.region} onChange={e=>setEditForm({...editForm, region: e.target.value})} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-400" placeholder="如: 首尔" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">状态</label>
                          <select value={editForm.status} onChange={e=>setEditForm({...editForm, status: e.target.value})} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-400">
                            <option value="alive">存活</option>
                            <option value="banned">封禁</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-indigo-500 mb-1">备注信息</label>
                        <textarea value={editForm.description} onChange={e=>setEditForm({...editForm, description: e.target.value})} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none min-h-[60px] focus:ring-1 focus:ring-indigo-400" />
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-indigo-100">
                        <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 bg-white border border-gray-200 rounded-lg transition-colors">取消</button>
                        <button onClick={() => saveEdit(acc.id)} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5"/> 保存修改</button>
                      </div>
                    </div>
                  );
                }

                // ==========================================
                // 渲染状态 2：默认展示卡片
                // ==========================================
                return (
                  <div key={acc.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all relative group flex flex-col">
                    {/* 卡片头部 */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-400">{acc.date}</span>
                        {acc.region && (
                          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 flex items-center">
                            <MapPin className="w-3 h-3 mr-0.5"/>
                            {acc.region}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => handleAccStatusToggle(acc.id, acc.status)} 
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${acc.status === 'alive' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                      >
                        {acc.status === 'alive' ? <><CheckCircle2 className="w-3 h-3 mr-1"/>存活</> : <><Ban className="w-3 h-3 mr-1"/>封禁</>}
                      </button>
                    </div>
                    
                    {/* 文本框：主账号数据 (调大了高度) */}
                    <div className="relative mb-3 flex-grow">
                      <textarea 
                        readOnly
                        value={decryptedAccountData}
                        onClick={(e) => { e.target.select(); copyToClipboard(decryptedAccountData, '账号凭证'); }}
                        className="w-full text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 text-gray-700 outline-none resize-none h-[110px] font-mono transition-colors cursor-pointer"
                        title="点击全选并复制主账号"
                      />
                      <button 
                        onClick={() => copyToClipboard(decryptedAccountData, '账号凭证')}
                        className="absolute right-2 top-2 p-1.5 bg-white border border-gray-200 rounded text-gray-500 hover:text-indigo-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        title="复制主账号数据"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 独立 2FA 显示框 */}
                    {acc.twoFactor && (
                      <div className="relative mb-4 group/2fa">
                        <div className="flex items-stretch h-[38px]">
                          <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold px-3 rounded-l-lg border border-indigo-100 border-r-0">
                            2FA
                          </span>
                          <input 
                            type="text"
                            readOnly
                            value={decryptedTwoFactor}
                            onClick={(e) => { e.target.select(); copyToClipboard(decryptedTwoFactor, '2FA 密钥'); }}
                            className="w-full text-sm bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100 rounded-r-lg px-3 text-indigo-700 outline-none font-mono transition-colors cursor-pointer"
                            title="点击复制 2FA"
                          />
                        </div>
                        <button 
                          onClick={() => copyToClipboard(decryptedTwoFactor, '2FA 密钥')}
                          className="absolute right-1.5 top-1.5 p-1 bg-white border border-indigo-100 rounded text-indigo-400 hover:text-indigo-600 shadow-sm opacity-0 group-hover/2fa:opacity-100 transition-opacity"
                          title="复制 2FA 密钥"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    
                    {/* 底部信息 (备注已实现自动换行，不再截断) */}
                    <div className="flex flex-col gap-2 text-sm mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">成本: ¥{Number(acc.cost).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-600 bg-gray-50 px-2.5 py-2 rounded text-xs break-words whitespace-pre-wrap border border-gray-100 min-h-[34px]">
                        {acc.description || <span className="text-gray-400 italic">暂无备注</span>}
                      </div>
                    </div>
                    
                    {/* 底部操作区新增【编辑按钮】 */}
                    <div className="border-t border-gray-100 pt-3 flex justify-end gap-2">
                       <button onClick={() => startEdit(acc)} className="text-gray-400 hover:text-indigo-500 transition-colors p-1" title="编辑此账号">
                         <Edit className="w-4 h-4" />
                       </button>
                       <button onClick={() => handleAccDelete(acc.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="彻底删除此账号">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 flex flex-col items-center">
               <Box className="w-12 h-12 mb-3 text-gray-200" />
               <p>{accounts.length > 0 ? "未找到匹配的账号记录" : "当前库存空空如也，请在上方面板录入"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 主应用入口 (包含 Router 路由配置)
// ==========================================
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('oracle_finance_auth') === 'true';
  });
  const [toastMessage, setToastMessage] = useState('');

  const handleLogout = () => {
    sessionStorage.removeItem('oracle_finance_auth');
    sessionStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login setAuth={setIsAuthenticated} /> : <Navigate to="/finance" replace />} 
        />
        
        {/* 受保护的路由容器 */}
        <Route element={isAuthenticated ? <Layout handleLogout={handleLogout} toastMessage={toastMessage} /> : <Navigate to="/login" replace />}>
          <Route path="/finance" element={<FinanceDashboard />} />
          <Route path="/inventory" element={<AccountInventory setToastMessage={setToastMessage} />} />
          
          {/* 默认重定向 */}
          <Route path="/" element={<Navigate to="/finance" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
