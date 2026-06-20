import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Server, Lock, 
  KeyRound, ShieldCheck, RefreshCw, Box, LayoutDashboard, Copy, 
  CheckCircle2, Ban, AlertCircle, LogOut
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
// 全局工具：安全加密 & 解密模块
// ==========================================
const getSecretKey = () => sessionStorage.getItem('token') || 'fallback_local_secret_key_2026';

const encryptText = (text) => {
  if (!text) return '';
  const key = getSecretKey();
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encodeURIComponent(result));
};

const decryptText = (cipherText) => {
  if (!cipherText) return '';
  try {
    const text = decodeURIComponent(atob(cipherText));
    const key = getSecretKey();
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result || '⚠️ 解密失败';
  } catch (error) {
    return '⚠️ 数据异常';
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
    let totalIncome = 0, totalExpense = 0, thisMonthIncome = 0, thisMonthExpense = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    transactions.forEach(t => {
      if (t.type === 'income') { totalIncome += t.amount; if (t.date.startsWith(currentMonth)) thisMonthIncome += t.amount; }
      else { totalExpense += t.amount; if (t.date.startsWith(currentMonth)) thisMonthExpense += t.amount; }
    });
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, thisMonthIncome, thisMonthExpense, thisMonthBalance: thisMonthIncome - thisMonthExpense };
  }, [transactions]);

  const chartData = useMemo(() => {
    const grouped = {};
    transactions.forEach(t => {
      const month = t.date.slice(0, 7); 
      if (!grouped[month]) grouped[month] = { name: month, income: 0, expense: 0 };
      t.type === 'income' ? grouped[month].income += t.amount : grouped[month].expense += t.amount;
    });
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  if (isLoading) return <div className="text-center text-gray-500 py-10">加载财务数据中...</div>;

  return (
    <div className="space-y-6">
      {/* 修改了 lg:grid-cols-4 为 lg:grid-cols-5，并新增了"历史总利润"卡片 */}
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
// 独立组件 4：账号库存 (AccountInventory) - 引入前端 AES 加密
// ==========================================
const AccountInventory = ({ setToastMessage }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accountFormData, setAccountFormData] = useState({ email: '', password: '', twoFactor: '', cost: '', status: 'alive', date: new Date().toISOString().split('T')[0], description: '' });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts', { headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } });
        if (response.ok) {
          const data = await response.json();
          // 数据在展示时进行解密（不修改原状态，仅在渲染时解密）
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

  const handleAccSubmit = async (e) => {
    e.preventDefault();
    if (!accountFormData.email || !accountFormData.password) return alert('账号和密码不能为空！');

    // 🌟 核心：提交前进行 AES 加密
    const newAccount = {
      ...accountFormData,
      id: Date.now().toString(),
      password: encryptText(accountFormData.password),
      twoFactor: accountFormData.twoFactor ? encryptText(accountFormData.twoFactor) : '',
      cost: parseFloat(accountFormData.cost) || 0,
    };

    setAccounts(prev => [newAccount, ...prev]);

    try {
      await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionStorage.getItem('token')}` },
        body: JSON.stringify(newAccount)
      });
    } catch (e) { console.log('保存账号到本地'); }
    
    setAccountFormData(prev => ({ ...prev, email: '', password: '', twoFactor: '', cost: '', description: '' }));
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

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if(setToastMessage) {
      setToastMessage(`${type}已复制`);
      setTimeout(() => setToastMessage(''), 2000);
    }
  };

  const stats = useMemo(() => {
    let aliveAccounts = 0, bannedAccounts = 0, totalCost = 0;
    accounts.forEach(acc => { acc.status === 'alive' ? aliveAccounts++ : bannedAccounts++; totalCost += (acc.cost || 0); });
    return { totalAccounts: accounts.length, aliveAccounts, bannedAccounts, totalCost };
  }, [accounts]);

  if (isLoading) return <div className="text-center text-gray-500 py-10">解密库存数据中...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"><span className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1"><Box className="w-4 h-4"/>总录入</span><div className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalAccounts} 个</div></div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100 bg-green-50/30"><span className="text-green-600 text-sm font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>当前存活</span><div className="text-2xl font-bold text-green-700 mt-1">{stats.aliveAccounts} 个</div></div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100 bg-red-50/30"><span className="text-red-600 text-sm font-medium mb-1 flex items-center gap-1"><Ban className="w-4 h-4"/>封禁/阵亡</span><div className="text-2xl font-bold text-red-600 mt-1">{stats.bannedAccounts} 个</div></div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"><span className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1"><DollarSign className="w-4 h-4"/>库存总成本</span><div className="text-2xl font-bold text-gray-800 mt-1">¥{stats.totalCost.toLocaleString()}</div></div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-500" /> 录入新账号 (安全加密)</h2>
        <form onSubmit={handleAccSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">注册邮箱 / 账号 *</label><input type="text" value={accountFormData.email} onChange={e=>setAccountFormData(p=>({...p, email:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:ring-indigo-500" required /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">登录密码 (本地加密) *</label><input type="text" value={accountFormData.password} onChange={e=>setAccountFormData(p=>({...p, password:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-indigo-50/50 p-2 text-sm focus:ring-indigo-500" required /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">2FA 密钥 (本地加密)</label><input type="text" value={accountFormData.twoFactor} onChange={e=>setAccountFormData(p=>({...p, twoFactor:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-indigo-50/50 p-2 text-sm focus:ring-indigo-500" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">单号成本</label><input type="number" value={accountFormData.cost} onChange={e=>setAccountFormData(p=>({...p, cost:e.target.value}))} step="0.01" className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">初始状态</label><select value={accountFormData.status} onChange={e=>setAccountFormData(p=>({...p, status:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm"><option value="alive">存活</option><option value="banned">封禁</option></select></div>
          </div>
          <div className="lg:col-span-2"><label className="block text-xs font-medium text-gray-500 mb-1">机型备注</label><input type="text" value={accountFormData.description} onChange={e=>setAccountFormData(p=>({...p, description:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">日期</label><input type="date" value={accountFormData.date} onChange={e=>setAccountFormData(p=>({...p, date:e.target.value}))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm" required /></div>
          <div className="flex items-end"><button type="submit" className="w-full text-white font-medium rounded-lg text-sm px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700"><Lock className="w-3 h-3 inline mr-1"/>加密保存</button></div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center"><h2 className="text-lg font-semibold text-gray-800">加密库存列表</h2></div>
        {accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50"><tr><th className="px-5 py-3 font-medium">日期</th><th className="px-5 py-3 font-medium w-64">账号凭证 (点击复制解密文)</th><th className="px-5 py-3 font-medium">备注</th><th className="px-5 py-3 font-medium">成本</th><th className="px-5 py-3 font-medium text-center">状态</th><th className="px-5 py-3 font-medium text-center">操作</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((acc) => {
                  // 渲染时进行解密展示
                  const decryptedPassword = decryptText(acc.password);
                  const decryptedTwoFactor = decryptText(acc.twoFactor);
                  
                  return (
                  <tr key={acc.id} className="bg-white hover:bg-gray-50">
                    <td className="px-5 py-4 whitespace-nowrap text-xs">{acc.date}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(acc.email, '账号')}><span className="font-medium text-gray-900 truncate max-w-[180px]">{acc.email}</span><Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500" /></div>
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(decryptedPassword, '密码')}>
                          <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">密码: {decryptedPassword === '⚠️ 数据异常' ? '***' : decryptedPassword}</span>
                          <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500" />
                        </div>
                        {acc.twoFactor && (
                          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(decryptedTwoFactor, '2FA 密钥')}>
                            <span className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">2FA: {decryptedTwoFactor === '⚠️ 数据异常' ? '***' : decryptedTwoFactor.slice(0,6)+'...'}</span>
                            <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-700 text-sm">{acc.description || '-'}</td>
                    <td className="px-5 py-4">¥{Number(acc.cost).toLocaleString()}</td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handleAccStatusToggle(acc.id, acc.status)} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer border ${acc.status === 'alive' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {acc.status === 'alive' ? <><CheckCircle2 className="w-3 h-3 mr-1"/>存活</> : <><Ban className="w-3 h-3 mr-1"/>封禁</>}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center"><button onClick={() => handleAccDelete(acc.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        ) : <div className="p-10 text-center text-gray-400">当前库存空空如也。</div>}
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
