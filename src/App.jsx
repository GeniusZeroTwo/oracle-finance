import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Server, Lock, KeyRound, ShieldCheck, RefreshCw } from 'lucide-react';

// 专为甲骨文服务器买卖定制的初始模拟数据
const initialTransactions = [
  { id: '1', type: 'income', amount: 450, category: '账号售卖', date: '2026-06-01', description: '首尔带原邮双ARM' },
  { id: '2', type: 'expense', amount: 35, category: '开卡成本', date: '2026-06-02', description: '购买虚拟卡(用于注册)' },
  { id: '3', type: 'income', amount: 280, category: '账号售卖', date: '2026-06-05', description: '春川单号无原邮' },
  { id: '4', type: 'expense', amount: 80, category: '代理IP', date: '2026-06-06', description: '住宅IP月付(注册用)' },
  { id: '5', type: 'income', amount: 150, category: '代开服务', date: '2026-06-10', description: '帮开ARM机器手续费' },
  { id: '6', type: 'expense', amount: 100, category: '服务器维护', date: '2026-06-12', description: '探针服务器续费' },
];

export default function App() {
  // ==========================================
  // 登录鉴权状态管理 (简化版)
  // ==========================================
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('oracle_finance_auth') === 'true';
  });
  
  // 登录面板状态
  const [loginStep, setLoginStep] = useState(1); // 1: 准备获取验证码, 2: 输入验证码
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');

  // 仪表盘原有状态
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 表单状态
  const [formData, setFormData] = useState({
    type: 'income', 
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  // ==========================================
  // 登录交互逻辑 (真实后端 API)
  // ==========================================
  
  // 发送验证码到 TG (不再需要用户名)
  const handleSendCode = async () => {
    setLoginError('');
    setLoginMessage('');
    setIsSendingCode(true);

    try {
      // 请求真实后端的验证码接口
      const res = await fetch('/api/auth/send-code', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '请求失败');
      }
      
      const data = await res.json();
      setLoginMessage(data.message || '验证码已发送，请查看您的 Telegram。');
      setLoginStep(2); // 进入输入验证码阶段
    } catch (error) {
      setLoginError(error.message || '验证码发送失败，请检查网络或后端配置');
    } finally {
      setIsSendingCode(false);
    }
  };

  // 验证登录码
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setLoginError('请输入完整的 6 位验证码');
      return;
    }
    setLoginError('');
    setIsVerifying(true);

    try {
      // 验证验证码并获取 Token (不再需要传递用户名)
      const res = await fetch('/api/auth/verify', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }) 
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '验证码错误或已过期');
      }

      const data = await res.json();
      sessionStorage.setItem('oracle_finance_auth', 'true'); 
      sessionStorage.setItem('token', data.token); // 保存真实鉴权 Token
      setIsAuthenticated(true);
    } catch (error) {
      setLoginError(error.message || '验证失败，请稍后再试');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('oracle_finance_auth');
    sessionStorage.removeItem('token');
    setIsAuthenticated(false);
    setLoginStep(1);
    setVerificationCode('');
    setLoginMessage('');
    setLoginError('');
  };


  // ==========================================
  // 原有业务：API 请求与本地降级逻辑 (受权限保护)
  // ==========================================
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/transactions', { 
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` } 
        });
        
        if (response.status === 401) {
          handleLogout();
          alert("登录状态已过期或未授权，请重新验证身份！");
          return;
        }

        if (!response.ok) throw new Error('API未就绪');
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.warn('后端 API 未响应或发生错误，已降级使用本地存储 (LocalStorage) 模式。');
        const saved = localStorage.getItem('oracle_finance_transactions');
        if (saved) {
          setTransactions(JSON.parse(saved));
        } else {
          setTransactions(initialTransactions);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchTransactions();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      localStorage.setItem('oracle_finance_transactions', JSON.stringify(transactions));
    }
  }, [transactions, isLoading, isAuthenticated]);

  // ==========================================
  // 事件处理逻辑
  // ==========================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      alert('请输入有效的金额！');
      return;
    }
    if (!formData.category) {
      alert('请输入分类！');
      return;
    }

    const newTransaction = {
      ...formData,
      id: Date.now().toString(),
      amount: parseFloat(formData.amount),
    };

    setTransactions(prev => [newTransaction, ...prev]);

    try {
      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(newTransaction)
      });
    } catch (e) {
      console.log('保存到本地'); 
    }
    
    setFormData(prev => ({ ...prev, amount: '', category: '', description: '' }));
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这条记录吗？')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      try {
        await fetch(`/api/transactions/${id}`, { 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
        });
      } catch (e) {
        console.log('从本地删除');
      }
    }
  };

  // ==========================================
  // 核心指标计算 (KPIs)
  // ==========================================
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        if (t.date.startsWith(currentMonth)) thisMonthIncome += t.amount;
      } else {
        totalExpense += t.amount;
        if (t.date.startsWith(currentMonth)) thisMonthExpense += t.amount;
      }
    });

    return {
      totalIncome, totalExpense, balance: totalIncome - totalExpense,
      thisMonthIncome, thisMonthExpense, thisMonthBalance: thisMonthIncome - thisMonthExpense
    };
  }, [transactions]);

  // ==========================================
  // 图表数据处理
  // ==========================================
  const chartData = useMemo(() => {
    const grouped = {};
    transactions.forEach(t => {
      const month = t.date.slice(0, 7); 
      if (!grouped[month]) {
        grouped[month] = { name: month, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        grouped[month].income += t.amount;
      } else {
        grouped[month].expense += t.amount;
      }
    });
    return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);


  // ==========================================
  // 渲染逻辑：安全拦截层 (Login UI)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">安全访问拦截</h2>
            <p className="text-indigo-100 mt-2 text-sm">系统包含敏感财务数据，请验证身份</p>
          </div>
          
          <div className="p-8">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center justify-center">
                {loginError}
              </div>
            )}
            {loginMessage && (
               <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-6 flex items-center justify-center">
                 {loginMessage}
               </div>
            )}

            {loginStep === 1 ? (
              <div className="space-y-6">
                <p className="text-sm text-gray-600 text-center">
                  为了您的数据安全，登录需要验证您的管理员身份。点击下方按钮，系统将向绑定的 Telegram 发送验证码。
                </p>
                <button
                  onClick={handleSendCode}
                  disabled={isSendingCode}
                  className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSendingCode ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 正在发送...</>
                  ) : '获取 Telegram 验证码'}
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
                    <input
                      type="text"
                      maxLength="6"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="pl-10 block w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 text-center tracking-[0.5em] text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="000000"
                      required
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                     <button type="button" onClick={handleSendCode} disabled={isSendingCode} className="text-xs text-gray-500 hover:text-indigo-600 disabled:opacity-50">
                      重新发送
                    </button>
                    <button type="button" onClick={() => setLoginStep(1)} className="text-xs text-indigo-600 hover:text-indigo-500">
                      返回
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isVerifying ? '验证中...' : '安全登录'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 渲染逻辑：正常业务面板
  // ==========================================
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">正在解密并加载数据...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-800">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 顶部标题栏定制 */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-8 h-8 text-indigo-600" />
              甲骨文业务收支面板
            </h1>
            <p className="text-gray-500 mt-1">云服务器买卖、开卡成本、代理IP盈亏一目了然</p>
          </div>
          {/* 添加退出登录按钮 */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm hover:bg-gray-50 hover:text-red-600 transition-colors self-start sm:self-auto"
          >
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">锁定面板</span>
          </button>
        </header>

        {/* 核心指标区域 (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-24 h-24 text-green-500" />
            </div>
            <span className="text-gray-500 text-sm font-medium mb-1">本月销售收入</span>
            <div className="text-3xl font-bold text-green-600 mb-2">
              ¥{stats.thisMonthIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-gray-400">历史总计: ¥{stats.totalIncome.toLocaleString()}</span>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingDown className="w-24 h-24 text-red-500" />
            </div>
            <span className="text-gray-500 text-sm font-medium mb-1">本月业务成本</span>
            <div className="text-3xl font-bold text-red-500 mb-2">
              ¥{stats.thisMonthExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-gray-400">历史总计: ¥{stats.totalExpense.toLocaleString()}</span>
          </div>

          <div className={`bg-white rounded-2xl p-6 shadow-sm border flex flex-col relative overflow-hidden ${stats.thisMonthBalance >= 0 ? 'border-green-100' : 'border-red-100'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <DollarSign className={`w-24 h-24 ${stats.thisMonthBalance >= 0 ? 'text-indigo-500' : 'text-orange-500'}`} />
            </div>
            <span className="text-gray-500 text-sm font-medium mb-1">本月净利润</span>
            <div className={`text-3xl font-bold mb-2 ${stats.thisMonthBalance >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>
              ¥{stats.thisMonthBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-gray-400">历史总利润: ¥{stats.balance.toLocaleString()}</span>
          </div>
        </div>

        {/* 主体内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 左侧：趋势对比图 */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              营收与成本对比趋势
            </h2>
            <div className="flex-1 w-full min-h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip 
                      cursor={{ fill: '#F3F4F6' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value, name) => [`¥${value}`, name === 'income' ? '收入' : '成本']}
                      labelFormatter={(label) => `${label} 月份统计`}
                    />
                    <Legend iconType="circle" formatter={(value) => <span className="text-gray-600">{value === 'income' ? '销售收入' : '业务成本'}</span>} />
                    <Bar dataKey="income" name="income" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="expense" name="expense" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  暂无数据，请添加记录
                </div>
              )}
            </div>
          </div>

          {/* 右侧：记账表单 */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-gray-400" />
              录入交易
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'income' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  进账 (卖号/代开)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${formData.type === 'expense' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  成本 (开卡/IP)
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">金额</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">¥</span>
                  </div>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-8 block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">日期</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">项目分类</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder={formData.type === 'income' ? '如: 售出首尔区' : '如: 虚拟卡费'}
                    className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">账号/买家备注 (可选)</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="如: 带原邮, 买家TG:xxx..."
                  className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className={`w-full text-white font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors ${formData.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
              >
                保存{formData.type === 'income' ? '进账' : '成本'}记录
              </button>
            </form>
          </div>
        </div>

        {/* 底部：带【总收入/总支出】对比统计的交易流水表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-800">业务流水明细</h2>
            
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">总收入:</span>
                <span className="text-base font-bold text-green-600">¥{stats.totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-600">总成本:</span>
                <span className="text-base font-bold text-red-500">¥{stats.totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium">日期</th>
                    <th className="px-6 py-3 font-medium">类型</th>
                    <th className="px-6 py-3 font-medium">项目分类</th>
                    <th className="px-6 py-3 font-medium">买家/账号备注</th>
                    <th className="px-6 py-3 font-medium text-right">金额</th>
                    <th className="px-6 py-3 font-medium text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{t.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type === 'income' ? '进账' : '成本'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">{t.category}</td>
                      <td className="px-6 py-4 truncate max-w-[200px]">{t.description || '-'}</td>
                      <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-10 text-center text-gray-400 flex flex-col items-center">
              <Server className="w-12 h-12 mb-3 text-gray-200" />
              <p>暂无业务流水，去录入今天卖出的第一台机器吧！</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
