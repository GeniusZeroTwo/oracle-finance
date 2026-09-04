import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Server, Lock,
  KeyRound, ShieldCheck, RefreshCw, Box, LayoutDashboard, Copy,
  CheckCircle2, Ban, AlertCircle, LogOut, Edit, MapPin, Search,
  ChevronDown, ChevronRight, ArrowUpDown
} from 'lucide-react';

// ==========================================
// 本地时区日期工具函数 (避免 toISOString 的 UTC 跨日跨月偏移)
// ==========================================
const getLocalDateStr = (d = new Date()) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return new Date().toLocaleDateString('en-CA');
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalMonthStr = (d = new Date()) => {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return new Date().toLocaleDateString('en-CA').slice(0, 7);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// ==========================================
// 模拟初始数据 (本地降级时使用)
// ==========================================
const initialTransactions = [
  { id: '1', type: 'income', amount: 450, category: '账号售卖', date: '2026-06-01', description: '首尔带原邮双ARM' },
  { id: '2', type: 'expense', amount: 35, category: '开卡成本', date: '2026-06-02', description: '购买虚拟卡(用于注册)' },
  { id: '3', type: 'income', amount: 280, category: '账号售卖', date: '2026-06-05', description: '春川单号无原邮' },
];

// 后端负责加解密，前端不再包含加密密钥或算法

// ==========================================
// 统一鉴权请求工具 (自动带 Token，自动处理 401 会话失效)
// ==========================================
const authFetch = async (url, options = {}) => {
  const token = sessionStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      sessionStorage.removeItem('oracle_finance_auth');
      sessionStorage.removeItem('token');
      localStorage.removeItem('oracle_finance_accounts');
      window.dispatchEvent(new CustomEvent('oracle_finance_auth_expired', {
        detail: { message: '登录会话已过期或在其他设备登录，请重新验证' }
      }));
    }
    return response;
  } catch (error) {
    throw error;
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '请求失败');
      setLoginMessage(data.message || '验证码已发送，请查看 Telegram。');
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '验证码错误');
      sessionStorage.setItem('oracle_finance_auth', 'true');
      sessionStorage.setItem('token', data.token);
      localStorage.removeItem('oracle_finance_accounts');
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
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({ type: 'income', amount: '', category: '', date: getLocalDateStr(), description: '' });

  const [sortOrder, setSortOrder] = useState('entry_desc');
  const [txSearch, setTxSearch] = useState('');

  const currentMonthStr = getLocalMonthStr();
  const [expandedMonths, setExpandedMonths] = useState({ [currentMonthStr]: true });

  const toggleMonth = (month) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const processedTransactions = useMemo(() => {
    let filtered = transactions;
    if (txSearch.trim()) {
      const q = txSearch.toLowerCase().trim();
      filtered = filtered.filter(t => 
        (t.category || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.date || '').includes(q) ||
        (t.type === 'income' ? '进账' : '成本').includes(q) ||
        String(t.amount || '').includes(q)
      );
    }

    const txWithIndex = filtered.map((t, idx) => ({ ...t, _entryIndex: idx }));

    if (sortOrder === 'entry_desc') {
      return [...txWithIndex].sort((a, b) => {
        const numA = Number(a.id), numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) > 100) return numB - numA;
        return a._entryIndex - b._entryIndex;
      });
    }

    if (sortOrder === 'entry_asc') {
      return [...txWithIndex].sort((a, b) => {
        const numA = Number(a.id), numB = Number(b.id);
        if (!isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) > 100) return numA - numB;
        return b._entryIndex - a._entryIndex;
      });
    }

    if (sortOrder === 'date_desc') {
      return [...txWithIndex].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (sortOrder === 'date_asc') {
      return [...txWithIndex].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    if (sortOrder === 'month_grouped') {
      const groups = {};
      txWithIndex.forEach(t => {
        const month = (t.date || '').slice(0, 7);
        if (!groups[month]) groups[month] = [];
        groups[month].push(t);
      });
      return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(month => ({
        month,
        txs: groups[month].sort((a, b) => {
          const numA = Number(a.id), numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB) && Math.abs(numA - numB) > 100) return numB - numA;
          return a._entryIndex - b._entryIndex;
        })
      }));
    }

    return txWithIndex;
  }, [transactions, sortOrder, txSearch]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [txRes, accRes] = await Promise.all([
          authFetch('/api/transactions'),
          authFetch('/api/accounts')
        ]);
        if (txRes.ok) {
          setTransactions(await txRes.json());
        } else {
          throw new Error('API未就绪');
        }
        if (accRes.ok) {
          setAccounts(await accRes.json());
        }
      } catch (error) {
        const savedTx = localStorage.getItem('oracle_finance_transactions');
        setTransactions(savedTx ? JSON.parse(savedTx) : initialTransactions);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) localStorage.setItem('oracle_finance_transactions', JSON.stringify(transactions));
  }, [transactions, isLoading]);

  // 检测孤儿流水（已删账号残留在流水表中的记录，导致成本虚高）
  const orphanTransactions = useMemo(() => {
    if (accounts.length === 0 || transactions.length === 0) return [];
    const accountIdSet = new Set(accounts.map(a => String(a.id)));
    return transactions.filter(t => {
      const match = String(t.id).match(/^(.+)-(cost|income)$/);
      if (match) {
        const accId = match[1];
        return !accountIdSet.has(accId);
      }
      return false;
    });
  }, [transactions, accounts]);

  const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);

  const handleCleanOrphans = async () => {
    if (orphanTransactions.length === 0) return;
    const orphanExpense = orphanTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    if (!window.confirm(`检测到 ${orphanTransactions.length} 笔已删账号的历史残留流水（导致成本虚高 ¥${orphanExpense.toFixed(2)}）。\n\n是否立即清理这些孤儿流水并恢复真实数据？`)) {
      return;
    }

    setIsCleaningOrphans(true);
    const orphanIds = new Set(orphanTransactions.map(t => t.id));
    try {
      await Promise.all(
        orphanTransactions.map(t => authFetch(`/api/transactions/${t.id}`, { method: 'DELETE' }))
      );
      setTransactions(prev => prev.filter(t => !orphanIds.has(t.id)));
      alert('已成功清理孤儿流水，财务看板数据已自动校准！');
    } catch (err) {
      alert('清理失败，请检查网络或重试');
    } finally {
      setIsCleaningOrphans(false);
    }
  };

  const handleTxSubmit = async (e) => {
    e.preventDefault();
    const newTx = { ...formData, id: Date.now().toString(), amount: parseFloat(formData.amount) };
    setTransactions(prev => [newTx, ...prev]);
    try {
      await authFetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTx) });
    } catch (e) { console.log('保存交易到本地'); }
    setFormData(prev => ({ ...prev, amount: '', category: '', description: '' }));
  };

  const handleTxDelete = async (id) => {
    if (!window.confirm('确定删除记录？')) return;
    setTransactions(prev => prev.filter(t => t.id !== id));
    try { await authFetch(`/api/transactions/${id}`, { method: 'DELETE' }); } catch (e) { }
  };

  const stats = useMemo(() => {
    let totalIncomeCents = 0, totalExpenseCents = 0, thisMonthIncomeCents = 0, thisMonthExpenseCents = 0;
    const currentMonth = getLocalMonthStr();

    transactions.forEach(t => {
      const amountCents = Math.round((parseFloat(t.amount) || 0) * 100);
      const tDate = t.date || '';
      if (t.type === 'income') {
        totalIncomeCents += amountCents;
        if (tDate.startsWith(currentMonth)) thisMonthIncomeCents += amountCents;
      } else {
        totalExpenseCents += amountCents;
        if (tDate.startsWith(currentMonth)) thisMonthExpenseCents += amountCents;
      }
    });

    // 基于库存 accounts 计算货值与真实毛利润
    let unsoldCostCents = 0;     // 待售库存货值 (存活且未售)
    let realizedIncomeCents = 0; // 已售总收入
    let realizedCostCents = 0;   // 已售进货成本
    let soldCount = 0;
    let unsoldAliveCount = 0;

    accounts.forEach(acc => {
      const costCents = Math.round((parseFloat(acc.cost) || 0) * 100);
      const incomeCents = Math.round((parseFloat(acc.income) || 0) * 100);

      if (incomeCents > 0) {
        soldCount++;
        realizedIncomeCents += incomeCents;
        realizedCostCents += costCents;
      } else if (acc.status === 'alive') {
        unsoldAliveCount++;
        unsoldCostCents += costCents;
      }
    });

    const realizedProfitCents = realizedIncomeCents - realizedCostCents;

    return {
      totalIncome: totalIncomeCents / 100,
      totalExpense: totalExpenseCents / 100,
      balance: (totalIncomeCents - totalExpenseCents) / 100,
      thisMonthIncome: thisMonthIncomeCents / 100,
      thisMonthExpense: thisMonthExpenseCents / 100,
      thisMonthBalance: (thisMonthIncomeCents - thisMonthExpenseCents) / 100,
      unsoldInventoryCost: unsoldCostCents / 100,
      unsoldAliveCount,
      realizedProfit: realizedProfitCents / 100,
      soldCount
    };
  }, [transactions, accounts]);

  const chartData = useMemo(() => {
    const grouped = {};
    transactions.forEach(t => {
      const month = (t.date || '').slice(0, 7);
      if (!month) return;
      if (!grouped[month]) grouped[month] = { name: month, income: 0, expense: 0 };

      const amountCents = Math.round((parseFloat(t.amount) || 0) * 100);
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
      {/* 孤儿流水异常检测横幅 */}
      {orphanTransactions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 text-sm shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-semibold text-amber-950">检测到 {orphanTransactions.length} 笔已删账号的历史残留孤儿流水</span>
              <span className="text-amber-800 text-xs ml-2">
                (导致历史成本虚高 ¥{orphanTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0).toFixed(2)})
              </span>
            </div>
          </div>
          <button
            onClick={handleCleanOrphans}
            disabled={isCleaningOrphans}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm whitespace-nowrap cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCleaningOrphans ? 'animate-spin' : ''}`} />
            {isCleaningOrphans ? '正在清理校准...' : '一键清理并恢复真实成本'}
          </button>
        </div>
      )}

      {/* 核心指标看板：本月经营表现 + 历史资产大盘 */}
      <div className="space-y-4">
        {/* 当月经营表现 */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white rounded-2xl p-5 border border-indigo-100/80 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-100"></span>
              <h3 className="text-sm font-bold text-gray-800 tracking-wide">
                本月经营表现 ({currentMonthStr})
              </h3>
            </div>
            <span className="text-xs text-gray-500 font-medium">当月流水归集与收支闭环</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
              <span className="text-gray-500 text-xs font-medium mb-1 block">本月销售收入</span>
              <div className="text-2xl font-bold text-green-600">
                ¥{stats.thisMonthIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">当月售出账号收入总计</span>
              <TrendingUp className="w-12 h-12 text-green-500 absolute -right-2 -bottom-2 opacity-10" />
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
              <span className="text-gray-500 text-xs font-medium mb-1 block">本月采购支出</span>
              <div className="text-2xl font-bold text-red-500">
                ¥{stats.thisMonthExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">当月进货/开卡等成本</span>
              <TrendingDown className="w-12 h-12 text-red-500 absolute -right-2 -bottom-2 opacity-10" />
            </div>

            <div className={`bg-white rounded-xl p-4 shadow-sm border relative overflow-hidden ${stats.thisMonthBalance >= 0 ? 'border-indigo-100' : 'border-orange-100'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-xs font-medium block">本月收支差额</span>
                <span className="text-[10px] text-gray-400 font-normal">收入 - 支出</span>
              </div>
              <div className={`text-2xl font-bold ${stats.thisMonthBalance >= 0 ? 'text-indigo-600' : 'text-orange-500'}`}>
                ¥{stats.thisMonthBalance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">当月现金流净额</span>
              <DollarSign className={`w-12 h-12 absolute -right-2 -bottom-2 opacity-10 ${stats.thisMonthBalance >= 0 ? 'text-indigo-500' : 'text-orange-500'}`} />
            </div>
          </div>
        </div>

        {/* 历史全期大盘与资产价值 */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-gray-400 ring-4 ring-gray-100"></span>
              <h3 className="text-sm font-bold text-gray-800 tracking-wide">
                历史全期大盘与资产价值
              </h3>
            </div>
            <span className="text-xs text-gray-400 font-medium">全期资金流向与实际商品毛利</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 relative overflow-hidden">
              <span className="text-gray-500 text-xs font-medium mb-1 block">历史总销售额</span>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                ¥{stats.totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">累计进账总流水</span>
            </div>

            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 relative overflow-hidden">
              <span className="text-gray-500 text-xs font-medium mb-1 block">历史总采购额</span>
              <div className="text-xl sm:text-2xl font-bold text-red-500">
                ¥{stats.totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">累计采购总支出</span>
            </div>

            <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 relative overflow-hidden">
              <span className="text-indigo-600 text-xs font-semibold mb-1 block flex items-center justify-between">
                <span>待售库存货值</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-normal">{stats.unsoldAliveCount} 个待售</span>
              </span>
              <div className="text-xl sm:text-2xl font-bold text-indigo-700">
                ¥{stats.unsoldInventoryCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-indigo-500/80 mt-0.5 block">在库存活账号本金资产</span>
            </div>

            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 relative overflow-hidden">
              <span className="text-emerald-700 text-xs font-semibold mb-1 block flex items-center justify-between">
                <span>真实销售毛利</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-normal">{stats.soldCount} 个已售</span>
              </span>
              <div className={`text-xl sm:text-2xl font-bold ${stats.realizedProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                ¥{stats.realizedProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-emerald-600/80 mt-0.5 block">已售收入 - 已售进价</span>
            </div>

            <div className={`rounded-xl p-4 border relative overflow-hidden col-span-2 sm:col-span-1 ${stats.balance >= 0 ? 'bg-gray-50/70 border-gray-100' : 'bg-orange-50/40 border-orange-100'}`}>
              <span className="text-gray-500 text-xs font-medium mb-1 block flex items-center justify-between">
                <span>累计收支结余</span>
                <span className="text-[10px] text-gray-400 font-normal">销售 - 采购</span>
              </span>
              <div className={`text-xl sm:text-2xl font-bold ${stats.balance >= 0 ? 'text-gray-800' : 'text-orange-600'}`}>
                ¥{stats.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-gray-400 mt-0.5 block">全期现金流净差额</span>
            </div>
          </div>
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
              <input type="number" name="amount" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))} step="0.01" min="0" placeholder="0.00" className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">日期</label><input type="date" name="date" value={formData.date} onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))} className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900" required /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">分类</label><input type="text" name="category" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900" required /></div>
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">账户名(可选)</label><input type="text" name="description" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} className="block w-full rounded-lg border-gray-300 bg-gray-50 border p-2.5 text-sm text-gray-900" placeholder="如果有关联的账户名可填入" /></div>
            <button type="submit" className={`w-full text-white font-medium rounded-lg text-sm px-5 py-3 transition-colors ${formData.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>保存</button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">业务流水明细</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
              共 {transactions.length} 笔记录
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索分类/账户/金额..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none w-48"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg shadow-sm">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <label className="text-xs text-gray-500 font-medium">排序方式:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-transparent text-gray-700 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="entry_desc">按录入先后 (最新在前)</option>
                <option value="entry_asc">按录入先后 (最早在前)</option>
                <option value="date_desc">按交易日期 (最新在前)</option>
                <option value="date_asc">按交易日期 (最早在前)</option>
                <option value="month_grouped">按月份分组</option>
              </select>
            </div>
          </div>
        </div>

        {processedTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium">日期</th>
                  <th className="px-6 py-3 font-medium">类型</th>
                  <th className="px-6 py-3 font-medium">分类</th>
                  <th className="px-6 py-3 font-medium">账户名</th>
                  <th className="px-6 py-3 font-medium text-right">金额</th>
                  <th className="px-6 py-3 font-medium text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortOrder === 'month_grouped' ? (
                  processedTransactions.map(({ month, txs }) => (
                    <React.Fragment key={month}>
                      <tr onClick={() => toggleMonth(month)} className="bg-gray-100/50 cursor-pointer hover:bg-gray-100 transition-colors">
                        <td colSpan="6" className="px-6 py-3 font-medium text-gray-700 flex items-center gap-2">
                          {expandedMonths[month] ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          {month} ({txs.length} 笔)
                        </td>
                      </tr>
                      {expandedMonths[month] && txs.map((t) => (
                        <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                          <td className="px-6 py-4">{t.date}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {t.type === 'income' ? '进账' : '成本'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{t.category}</td>
                          <td className="px-6 py-4">{t.description || '-'}</td>
                          <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                            {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={() => handleTxDelete(t.id)} className="text-gray-400 hover:text-red-500 p-1">
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  processedTransactions.map((t) => (
                    <tr key={t.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4">{t.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type === 'income' ? '进账' : '成本'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{t.category}</td>
                      <td className="px-6 py-4">{t.description || '-'}</td>
                      <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}¥{t.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleTxDelete(t.id)} className="text-gray-400 hover:text-red-500 p-1">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-gray-400">
            <p>{txSearch ? '未搜索到匹配的业务流水记录' : '暂无业务流水记录'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 独立组件 3.5：TOTP 验证码显示 (TotpDisplay)
// ==========================================
// 全局单例时钟，解决海量验证码时的性能瓶颈
const totpTimerManager = {
  subscribers: new Set(),
  intervalId: null,
  start() {
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        const epoch = Math.floor(Date.now() / 1000);
        const remain = 30 - (epoch % 30);
        this.subscribers.forEach(cb => cb(remain));
      }, 1000);
    }
  },
  subscribe(callback) {
    this.subscribers.add(callback);
    this.start();
    const epoch = Math.floor(Date.now() / 1000);
    callback(30 - (epoch % 30));
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };
  }
};

const TotpDisplay = ({ secret, copyToClipboard, label = "验证码" }) => {
  const [code, setCode] = useState('------');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    let isMounted = true;
    
    const updateCode = async () => {
      if (!secret) return;
      try {
        const base32ToUint8Array = (base32) => {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
          let bits = 0, value = 0, index = 0;
          const cleanBase32 = base32.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
          const output = new Uint8Array(Math.floor((cleanBase32.length * 5) / 8));
          for (let i = 0; i < cleanBase32.length; i++) {
            const val = alphabet.indexOf(cleanBase32[i]);
            if (val === -1) continue;
            value = (value << 5) | val;
            bits += 5;
            if (bits >= 8) {
              output[index++] = (value >>> (bits - 8)) & 255;
              bits -= 8;
            }
          }
          return output;
        };

        const cleanSecret = secret.replace(/\s+/g, '');
        if (!cleanSecret) return;
        const keyBytes = base32ToUint8Array(cleanSecret);

        let epoch = Math.floor(Date.now() / 1000);
        let timeTemp = Math.floor(epoch / 30);
        
        const timeBytes = new Uint8Array(8);
        for (let i = 7; i >= 0; i--) {
          timeBytes[i] = timeTemp & 0xff;
          timeTemp = Math.floor(timeTemp / 256);
        }

        const cryptoKey = await crypto.subtle.importKey(
          'raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBytes);
        const hmac = new Uint8Array(signature);

        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary =
          ((hmac[offset] & 0x7f) << 24) |
          ((hmac[offset + 1] & 0xff) << 16) |
          ((hmac[offset + 2] & 0xff) << 8) |
          (hmac[offset + 3] & 0xff);

        let totp = (binary % 1000000).toString();
        while (totp.length < 6) totp = '0' + totp;

        if (isMounted) setCode(totp);
      } catch (err) {
        console.error('TOTP Error:', err);
        if (isMounted) setCode('Error');
      }
    };

    updateCode();
    
    // 订阅全局单例时钟
    const unsubscribe = totpTimerManager.subscribe((remain) => {
      if (isMounted) {
        setTimeLeft(remain);
        if (remain === 30) {
          updateCode();
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [secret]);

  return (
    <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 px-3 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-indigo-500 text-xs font-medium flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> {label}:
        </span>
        <span 
          onClick={() => { if(code !== '------' && code !== 'Error') copyToClipboard(code, label) }} 
          className="text-indigo-700 font-mono font-bold text-lg tracking-wider cursor-pointer hover:text-indigo-900 transition-colors"
          title="点击复制验证码"
        >
          {code}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-indigo-400 w-4 text-right">{timeLeft}</div>
        <svg className="w-4 h-4 transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-indigo-100"
            strokeDasharray="100, 100"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className={timeLeft > 5 ? "text-indigo-500 transition-all duration-1000 ease-linear" : "text-red-500 transition-all duration-1000 ease-linear"}
            strokeDasharray={`${(timeLeft / 30) * 100}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
        </svg>
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
  const [exchangeRate, setExchangeRate] = useState(7.2);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [rateUpdatedAt, setRateUpdatedAt] = useState('');
  const [accountSortOrder, setAccountSortOrder] = useState('entry_desc');

  const fetchExchangeRate = async () => {
    setIsFetchingRate(true);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await res.json();
      if (data?.rates?.CNY) {
        setExchangeRate(Number(data.rates.CNY));
        const now = new Date();
        setRateUpdatedAt(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      }
    } catch (e) {
      console.error('获取实时汇率失败，保留当前汇率:', e);
    } finally {
      setIsFetchingRate(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();

    // 自动刷新：每 10 分钟自动在后台静默获取一次最新汇率
    const intervalId = setInterval(() => {
      fetchExchangeRate();
    }, 10 * 60 * 1000);

    // 页面切回可见时自动刷新最新汇率
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchExchangeRate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 用于控制卡片编辑状态的 State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ accountData: '', twoFactor: '', email2fa: '', cost: '', costCurrency: 'CNY', income: '', soldDate: '', accountName: '', status: 'alive', description: '', region: '' });

  // 独立的账号粘贴框 与 2FA单独字段
  const [accountFormData, setAccountFormData] = useState({
    accountData: '',
    twoFactor: '',
    email2fa: '',
    cost: '',
    costCurrency: 'CNY',
    income: '',
    soldDate: '',
    accountName: '',
    status: 'alive',
    date: getLocalDateStr(),
    description: '',
    region: ''
  });

  useEffect(() => {
    // 首次进入主动清除本地存储中的历史账号明文缓存，消除磁盘泄漏风险
    localStorage.removeItem('oracle_finance_accounts');

    const fetchAccounts = async () => {
      try {
        const response = await authFetch('/api/accounts');
        if (response.ok) {
          const data = await response.json();
          setAccounts(data);
        } else throw new Error('API未就绪');
      } catch (error) {
        console.error('拉取账号数据失败:', error);
        setAccounts([]);
      } finally { setIsLoading(false); }
    };
    fetchAccounts();
  }, []);

  const syncTransaction = async (accountId, type, amount, date, accountName) => {
    const numAmount = parseFloat(amount);
    const txId = `${accountId}-${type}`;
    if (numAmount > 0) {
      const txData = {
        type: type === 'cost' ? 'expense' : 'income',
        amount: numAmount,
        category: type === 'cost' ? '账号成本' : '账号收入',
        date: date || getLocalDateStr(),
        description: accountName || ''
      };
      try {
        await authFetch(`/api/transactions/${txId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(txData)
        });
      } catch(e) {}
    } else {
      try {
        await authFetch(`/api/transactions/${txId}`, {
          method: 'DELETE'
        });
      } catch(e) {}
    }
  };

  // 处理表单提交 (整体加密账号数据，并附带标识)
  const handleAccSubmit = async (e) => {
    e.preventDefault();

    if (!accountFormData.accountData) {
      return alert('请粘贴或填写账号数据！');
    }

    let finalCost = parseFloat(accountFormData.cost) || 0;
    if (accountFormData.costCurrency === 'USD') {
      finalCost = parseFloat((finalCost * exchangeRate).toFixed(2));
    }

    const hasIncome = parseFloat(accountFormData.income) > 0;
    const soldDate = hasIncome ? (accountFormData.soldDate || accountFormData.date) : '';

    const newAccount = {
      ...accountFormData,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      email: accountFormData.accountData, // 后端会自动加密
      password: 'MERGED_DATA', // 标识符，表明该条数据使用的是不拆分的合并格式
      twoFactor: accountFormData.twoFactor || '',
      email2fa: accountFormData.email2fa || '',
      cost: finalCost,
      income: parseFloat(accountFormData.income) || 0,
      soldDate: soldDate,
      accountName: accountFormData.accountName || '',
      region: accountFormData.region || '',
    };

    // 更新本地状态展示
    setAccounts(prev => [newAccount, ...prev]);

    try {
      const res = await authFetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount)
      });

      if (!res.ok) {
        let errorMsg = '录入请求失败，状态码: ' + res.status;
        const rawText = await res.text();
        try {
          const errorData = JSON.parse(rawText);
          errorMsg = errorData.error || errorMsg;
        } catch (parseError) {
          errorMsg += '\n非JSON返回值: ' + rawText.substring(0, 100);
        }
        throw new Error(errorMsg);
      }

      if (setToastMessage) {
        setToastMessage('账号已安全加密并录入');
      }

      await syncTransaction(newAccount.id, 'cost', finalCost, accountFormData.date, accountFormData.accountName);
      await syncTransaction(newAccount.id, 'income', accountFormData.income, soldDate || accountFormData.date, accountFormData.accountName);
    } catch (e) {
      console.log('保存失败', e);
      alert('保存到云端失败：' + e.message);
    }

    // 清空表单，保留日期等选项
    setAccountFormData(prev => ({ ...prev, accountData: '', twoFactor: '', email2fa: '', cost: '', costCurrency: 'CNY', income: '', soldDate: '', accountName: '', description: '', region: '' }));
  };

  const handleAccDelete = async (id) => {
    if (!window.confirm('删除账号记录不可恢复，同时将清理关联的财务流水，确定删除？')) return;
    setAccounts(prev => prev.filter(t => t.id !== id));
    try {
      await authFetch(`/api/accounts/${id}`, { method: 'DELETE' });
      await authFetch(`/api/transactions/${id}-cost`, { method: 'DELETE' });
      await authFetch(`/api/transactions/${id}-income`, { method: 'DELETE' });
    } catch (e) { }
  };

  const handleAccStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'alive' ? 'banned' : 'alive';
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, status: newStatus } : acc));
    try {
      await authFetch(`/api/accounts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    } catch (e) { }
  };

  // 启动编辑
  const startEdit = (acc) => {
    setEditingId(acc.id);
    const hasIncome = parseFloat(acc.income) > 0;
    setEditForm({
      accountData: acc.email, // 后端已解密为明文
      twoFactor: acc.twoFactor || '',
      email2fa: acc.email2fa || '',
      cost: acc.cost,
      costCurrency: 'CNY',
      income: acc.income || '',
      soldDate: acc.soldDate || (hasIncome ? (acc.date || getLocalDateStr()) : getLocalDateStr()),
      accountName: acc.accountName || '',
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
    let finalCost = parseFloat(editForm.cost) || 0;
    if (editForm.costCurrency === 'USD') {
      finalCost = parseFloat((finalCost * exchangeRate).toFixed(2));
    }

    const currentAcc = accounts.find(a => a.id === id) || {};
    const hasIncome = parseFloat(editForm.income) > 0;
    const soldDate = hasIncome ? (editForm.soldDate || getLocalDateStr()) : '';

    const updatedAcc = {
      id, // 保持原始ID不变
      email: editForm.accountData, // 后端会自动加密
      password: 'MERGED_DATA',
      twoFactor: editForm.twoFactor || '',
      email2fa: editForm.email2fa || '',
      cost: finalCost,
      income: parseFloat(editForm.income) || 0,
      soldDate: soldDate,
      accountName: editForm.accountName || '',
      status: editForm.status,
      description: editForm.description,
      region: editForm.region || '',
      date: currentAcc.date || getLocalDateStr() // 保持原始进货录入日期
    };

    // 本地优先更新 (乐观更新)
    setAccounts(prev => prev.map(a => a.id === id ? updatedAcc : a));
    setEditingId(null);

    try {
      // 正规调用：直接使用后端的 PUT 接口完成整条记录的原位更新
      const res = await authFetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAcc)
      });

      if (!res.ok) {
        let errorMsg = '更新请求失败，状态码: ' + res.status;
        const rawText = await res.text();
        try {
          const errorData = JSON.parse(rawText);
          errorMsg = errorData.error || errorMsg;
        } catch (parseError) {
          errorMsg += '\n非JSON返回值: ' + rawText.substring(0, 100);
        }
        throw new Error(errorMsg);
      }

      if (setToastMessage) {
        setToastMessage('修改已重新加密保存');
      }

      // 关键修复：成本同步使用采购建档日期，收入流水使用实际售出日期（准确归集到当月业绩！）
      await syncTransaction(id, 'cost', finalCost, updatedAcc.date, editForm.accountName);
      await syncTransaction(id, 'income', editForm.income, soldDate || updatedAcc.date, editForm.accountName);
    } catch (e) {
      console.error('Update failed', e);
      alert('同步到服务器失败：' + e.message);
    }
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (setToastMessage) {
      setToastMessage(`完整${type}已复制`);
    }
  };

  const stats = useMemo(() => {
    let aliveAccounts = 0, bannedAccounts = 0, totalCostCents = 0, unsoldCostCents = 0, soldCount = 0;
    accounts.forEach(acc => {
      const isAlive = acc.status === 'alive';
      const isSold = parseFloat(acc.income) > 0;
      if (isAlive) aliveAccounts++;
      else bannedAccounts++;

      const cost = Math.round((parseFloat(acc.cost) || 0) * 100);
      totalCostCents += cost;
      if (isAlive && !isSold) {
        unsoldCostCents += cost;
      }
      if (isSold) soldCount++;
    });
    return {
      totalAccounts: accounts.length,
      aliveAccounts,
      bannedAccounts,
      soldAccounts: soldCount,
      unsoldAliveAccounts: aliveAccounts - soldCount,
      totalCost: totalCostCents / 100,
      unsoldCost: unsoldCostCents / 100
    };
  }, [accounts]);

  const displayAccounts = useMemo(() => {
    const mapped = accounts.map((acc, idx) => {
      // 后端已自动解密，统一返回明文
      return {
        ...acc,
        _entryIndex: idx,
        decryptedAccountData: acc.email || '',
        decryptedTwoFactor: acc.twoFactor || '',
        decryptedEmailTwoFactor: acc.email2fa || '',
        decryptedVerificationCode: acc.verificationCode || ''
      };
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

    // 排序逻辑：默认 entry_desc (按添加时间 - 最新在前)
    if (accountSortOrder === 'entry_desc') {
      return [...mapped].sort((a, b) => {
        // id 格式形如 Date.now() + 随机串，前13位通常为添加时间戳
        const tsA = parseInt(String(a.id).slice(0, 13), 10);
        const tsB = parseInt(String(b.id).slice(0, 13), 10);
        if (!isNaN(tsA) && !isNaN(tsB) && Math.abs(tsA - tsB) > 50) {
          return tsB - tsA;
        }
        return a._entryIndex - b._entryIndex;
      });
    }

    if (accountSortOrder === 'entry_asc') {
      return [...mapped].sort((a, b) => {
        const tsA = parseInt(String(a.id).slice(0, 13), 10);
        const tsB = parseInt(String(b.id).slice(0, 13), 10);
        if (!isNaN(tsA) && !isNaN(tsB) && Math.abs(tsA - tsB) > 50) {
          return tsA - tsB;
        }
        return b._entryIndex - a._entryIndex;
      });
    }

    if (accountSortOrder === 'date_desc') {
      return [...mapped].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    if (accountSortOrder === 'date_asc') {
      return [...mapped].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    return mapped;
  }, [accounts, searchQuery, accountSortOrder]);

  if (isLoading) return <div className="text-center text-gray-500 py-10">加载库存数据中...</div>;

  return (
    <div className="space-y-6">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <span className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-1"><Box className="w-4 h-4" />总录入</span>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalAccounts} 个</div>
          <span className="text-xs text-gray-400 mt-1 block">已售出 {stats.soldAccounts} 个</span>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100 bg-green-50/30">
          <span className="text-green-600 text-sm font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />当前存活</span>
          <div className="text-2xl font-bold text-green-700 mt-1">{stats.aliveAccounts} 个</div>
          <span className="text-xs text-green-600/80 mt-1 block">其中待售 {stats.unsoldAliveAccounts} 个</span>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100 bg-red-50/30">
          <span className="text-red-600 text-sm font-medium mb-1 flex items-center gap-1"><Ban className="w-4 h-4" />封禁/阵亡</span>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.bannedAccounts} 个</div>
          <span className="text-xs text-red-500/80 mt-1 block">不可售损耗</span>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-indigo-100 bg-indigo-50/20">
          <span className="text-indigo-600 text-sm font-medium mb-1 flex items-center gap-1"><DollarSign className="w-4 h-4" />待售库存货值</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">¥{stats.unsoldCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</div>
          <span className="text-xs text-gray-400 mt-1 block">历史进货累计: ¥{stats.totalCost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* 录入表单：恢复独立字段录入 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-500" /> 录入新账号 (安全加密)
        </h2>
        <form onSubmit={handleAccSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 lg:row-span-3 flex flex-col h-full">
              <label className="block text-xs font-medium text-gray-500 mb-1">账号数据 (邮箱、密码等直接粘贴，不再拆分) *</label>
              <textarea value={accountFormData.accountData} onChange={e => setAccountFormData(p => ({ ...p, accountData: e.target.value }))} className="block w-full h-full min-h-[180px] rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:ring-indigo-500 outline-none resize-y flex-1 font-mono" placeholder="在此粘贴完整账号信息..." required />
            </div>
          <div className="lg:col-span-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">账户 2FA 密钥 (独立填写，本地加密)</label>
            <input type="text" value={accountFormData.twoFactor} onChange={e => setAccountFormData(p => ({ ...p, twoFactor: e.target.value }))} className="block w-full rounded-lg border border-gray-300 bg-indigo-50/50 p-2 text-sm focus:ring-indigo-500 outline-none font-mono mb-3" placeholder="单独粘贴 2FA" />
            <label className="block text-xs font-medium text-gray-500 mb-1">邮箱 2FA 密钥</label>
            <input type="text" value={accountFormData.email2fa} onChange={e => setAccountFormData(p => ({ ...p, email2fa: e.target.value }))} className="block w-full rounded-lg border border-gray-300 bg-indigo-50/50 p-2 text-sm focus:ring-indigo-500 outline-none font-mono" placeholder="邮箱 2FA 密钥" />
          </div>
          <div className="grid grid-cols-2 gap-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-500">单号成本</label>
                {accountFormData.costCurrency === 'USD' && (
                  <button
                    type="button"
                    onClick={fetchExchangeRate}
                    disabled={isFetchingRate}
                    className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    title="点击刷新实时汇率"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingRate ? 'animate-spin' : ''}`} />
                    <span>1$ = ¥{exchangeRate.toFixed(4)}</span>
                  </button>
                )}
              </div>
              <div className="flex bg-gray-50 border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500">
                <button
                  type="button"
                  onClick={() => {
                    setAccountFormData(p => {
                      const nextCur = p.costCurrency === 'CNY' ? 'USD' : 'CNY';
                      if (nextCur === 'USD') fetchExchangeRate();
                      return { ...p, costCurrency: nextCur };
                    });
                  }}
                  className="bg-gray-200 hover:bg-gray-300 border-r border-gray-300 text-gray-700 text-xs font-bold px-3 outline-none transition-colors"
                  title="点击切换货币 (人民币 ¥ / 美元 $)"
                >
                  {accountFormData.costCurrency === 'CNY' ? '¥' : '$'}
                </button>
                <input
                  type="number"
                  value={accountFormData.cost}
                  onChange={e => setAccountFormData(p => ({ ...p, cost: e.target.value }))}
                  step="0.01"
                  className="block w-full bg-transparent p-2 text-sm outline-none"
                  placeholder={accountFormData.costCurrency === 'USD' ? `输入美元金额` : '0.00'}
                />
              </div>
              {accountFormData.costCurrency === 'USD' && (
                <div className="mt-1 flex items-center justify-between text-[11px] text-indigo-600 bg-indigo-50/70 px-2 py-0.5 rounded border border-indigo-100/60 font-medium">
                  <span>
                    实时折合: <strong className="font-bold text-indigo-700">¥{(parseFloat(accountFormData.cost || 0) * exchangeRate).toFixed(2)}</strong>
                  </span>
                  {rateUpdatedAt && <span className="text-[10px] text-gray-400">({rateUpdatedAt} 更新)</span>}
                </div>
              )}
            </div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">单号收入</label><input type="number" value={accountFormData.income} onChange={e => setAccountFormData(p => ({ ...p, income: e.target.value }))} step="0.01" className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:col-span-1">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">账户名</label><input type="text" value={accountFormData.accountName} onChange={e => setAccountFormData(p => ({ ...p, accountName: e.target.value }))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" placeholder="如: xxx" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">初始状态</label><select value={accountFormData.status} onChange={e => setAccountFormData(p => ({ ...p, status: e.target.value }))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500"><option value="alive">存活</option><option value="banned">封禁</option></select></div>
          </div>
          <div className="lg:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">机型备注</label><input type="text" value={accountFormData.description} onChange={e => setAccountFormData(p => ({ ...p, description: e.target.value }))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" /></div>
          <div className="lg:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">区域</label><input type="text" value={accountFormData.region} onChange={e => setAccountFormData(p => ({ ...p, region: e.target.value }))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" placeholder="如: 首尔" /></div>
          <div className="lg:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">日期</label><input type="date" value={accountFormData.date} onChange={e => setAccountFormData(p => ({ ...p, date: e.target.value }))} className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm outline-none focus:ring-indigo-500" required /></div>
          <div className="flex items-end lg:col-span-1"><button type="submit" className="w-full text-white font-medium rounded-lg text-sm px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center"><Lock className="w-4 h-4 mr-1.5" />加密保存</button></div>
        </form>
      </div>

      {/* 卡片式库存展示：不再割裂账号密码 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">加密库存 (卡片视图)</h2>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
              共 {displayAccounts.length} 个账号
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="搜索账号、备注或区域..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-gray-300 px-2.5 py-1.5 rounded-lg shadow-sm">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <label className="text-xs text-gray-500 font-medium whitespace-nowrap">排序方式:</label>
              <select
                value={accountSortOrder}
                onChange={(e) => setAccountSortOrder(e.target.value)}
                className="bg-transparent text-gray-700 text-xs font-medium focus:outline-none cursor-pointer"
              >
                <option value="entry_desc">按添加时间 (最新在前)</option>
                <option value="entry_asc">按添加时间 (最早在前)</option>
                <option value="date_desc">按业务日期 (最新在前)</option>
                <option value="date_asc">按业务日期 (最早在前)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {displayAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayAccounts.map((acc) => {
                const { decryptedAccountData, decryptedTwoFactor, decryptedEmailTwoFactor, decryptedVerificationCode } = acc;

                // ==========================================
                // 渲染状态 1：编辑模式卡片
                // ==========================================
                if (editingId === acc.id) {
                  return (
                    <div key={acc.id} className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-5 shadow-sm transition-all relative flex flex-col gap-3">
                      <div className="text-sm font-semibold text-indigo-700 border-b border-indigo-100 pb-2 mb-1 flex items-center"><Edit className="w-4 h-4 mr-1.5" />编辑加密账号</div>

                      <div>
                        <label className="block text-xs font-medium text-indigo-500 mb-1">账号数据</label>
                        <textarea value={editForm.accountData} onChange={e => setEditForm({ ...editForm, accountData: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2.5 outline-none h-[110px] font-mono focus:ring-1 focus:ring-indigo-400" />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">2FA 密钥</label>
                          <input value={editForm.twoFactor} onChange={e => setEditForm({ ...editForm, twoFactor: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2.5 outline-none font-mono focus:ring-1 focus:ring-indigo-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">邮箱 2FA</label>
                          <input value={editForm.email2fa} onChange={e => setEditForm({ ...editForm, email2fa: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2.5 outline-none font-mono focus:ring-1 focus:ring-indigo-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-medium text-indigo-500">
                              成本 ({editForm.costCurrency === 'CNY' ? '¥' : '$'})
                            </label>
                            {editForm.costCurrency === 'USD' && (
                              <button
                                type="button"
                                onClick={fetchExchangeRate}
                                disabled={isFetchingRate}
                                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                                title="点击刷新实时汇率"
                              >
                                <RefreshCw className={`w-2.5 h-2.5 ${isFetchingRate ? 'animate-spin' : ''}`} />
                                <span>1$ = ¥{exchangeRate.toFixed(4)}</span>
                              </button>
                            )}
                          </div>
                          <div className="flex bg-white border border-indigo-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-indigo-400">
                            <button
                              type="button"
                              onClick={() => {
                                setEditForm(p => {
                                  const nextCur = p.costCurrency === 'CNY' ? 'USD' : 'CNY';
                                  if (nextCur === 'USD') fetchExchangeRate();
                                  return { ...p, costCurrency: nextCur };
                                });
                              }}
                              className="bg-indigo-100 hover:bg-indigo-200 border-r border-indigo-200 text-indigo-700 text-xs font-bold px-3 outline-none transition-colors"
                              title="点击切换货币 (人民币 ¥ / 美元 $)"
                            >
                              {editForm.costCurrency === 'CNY' ? '¥' : '$'}
                            </button>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.cost}
                              onChange={e => setEditForm({ ...editForm, cost: e.target.value })}
                              className="w-full text-sm bg-transparent p-2 outline-none"
                              placeholder={editForm.costCurrency === 'USD' ? '输入美元金额' : '0.00'}
                            />
                          </div>
                          {editForm.costCurrency === 'USD' && (
                            <div className="mt-1 flex items-center justify-between text-[11px] text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded font-medium">
                              <span>实时折合: <strong className="font-bold">¥{(parseFloat(editForm.cost || 0) * exchangeRate).toFixed(2)}</strong></span>
                              {rateUpdatedAt && <span className="text-[10px] text-gray-400">({rateUpdatedAt} 更新)</span>}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">收入 (¥)</label>
                          <input type="number" step="0.01" value={editForm.income} onChange={e => setEditForm({ ...editForm, income: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-400" placeholder="未售留空" />
                          {parseFloat(editForm.income) > 0 && (
                            <div className="mt-1.5 animate-in fade-in duration-200">
                              <label className="block text-[10px] font-medium text-indigo-500 mb-0.5">售出日期 (归集当月销售)</label>
                              <input type="date" value={editForm.soldDate || getLocalDateStr()} onChange={e => setEditForm({ ...editForm, soldDate: e.target.value })} className="w-full text-xs border border-indigo-200 bg-white rounded p-1.5 outline-none text-gray-700 focus:ring-1 focus:ring-indigo-400" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">账户名</label>
                          <input type="text" value={editForm.accountName} onChange={e => setEditForm({ ...editForm, accountName: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-400" placeholder="如: xxx" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">区域</label>
                          <input type="text" value={editForm.region} onChange={e => setEditForm({ ...editForm, region: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-400" placeholder="如: 首尔" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-500 mb-1">状态</label>
                          <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-indigo-400">
                            <option value="alive">存活</option>
                            <option value="banned">封禁</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-indigo-500 mb-1">备注信息</label>
                        <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full text-sm border border-indigo-200 bg-white rounded-lg p-2 outline-none min-h-[60px] focus:ring-1 focus:ring-indigo-400" />
                      </div>

                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-indigo-100">
                        <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 bg-white border border-gray-200 rounded-lg transition-colors">取消</button>
                        <button onClick={() => saveEdit(acc.id)} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5" /> 保存修改</button>
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
                        {acc.accountName && (
                          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 flex items-center">
                            <MapPin className="w-3 h-3 mr-0.5" />
                            {acc.accountName}
                          </span>
                        )}
                        {acc.region && (
                          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 flex items-center">
                            <MapPin className="w-3 h-3 mr-0.5" />
                            {acc.region}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleAccStatusToggle(acc.id, acc.status)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${acc.status === 'alive' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                      >
                        {acc.status === 'alive' ? <><CheckCircle2 className="w-3 h-3 mr-1" />存活</> : <><Ban className="w-3 h-3 mr-1" />封禁</>}
                      </button>
                    </div>

                    {/* 文本框：主账号数据 (调大了高度) */}
                    <div className="relative mb-3 flex-grow">
                      <textarea
                        readOnly
                        value={decryptedAccountData}
                        className="w-full text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-3 text-gray-700 outline-none resize-none h-[110px] font-mono transition-colors"
                        title="主账号数据"
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
                      <div className="mb-4">
                        <div className="relative group/2fa">
                          <div className="flex items-stretch h-[38px]">
                            <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold px-3 rounded-l-lg border border-indigo-100 border-r-0">
                              账户2FA
                            </span>
                            <input
                              type="text"
                              readOnly
                              value={decryptedTwoFactor}
                              className="w-full text-sm bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100 rounded-r-lg px-3 text-indigo-700 outline-none font-mono transition-colors"
                              title="2FA 密钥"
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
                        <TotpDisplay secret={decryptedTwoFactor} copyToClipboard={copyToClipboard} label="账户 2FA 验证码" />
                      </div>
                    )}

                    {/* 邮箱 2FA 和 验证码 */}
                    {acc.email2fa && (
                      <div className="mb-4">
                        <div className="relative group/email2fa">
                          <div className="flex items-stretch h-[38px]">
                            <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold px-3 rounded-l-lg border border-indigo-100 border-r-0">
                              邮箱2FA
                            </span>
                            <input
                              type="text"
                              readOnly
                              value={decryptedEmailTwoFactor}
                              className="w-full text-sm bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100 rounded-r-lg px-3 text-indigo-700 outline-none font-mono transition-colors"
                              title="邮箱 2FA"
                            />
                          </div>
                          <button
                            onClick={() => copyToClipboard(decryptedEmailTwoFactor, '邮箱 2FA')}
                            className="absolute right-1.5 top-1.5 p-1 bg-white border border-indigo-100 rounded text-indigo-400 hover:text-indigo-600 shadow-sm opacity-0 group-hover/email2fa:opacity-100 transition-opacity"
                            title="复制邮箱 2FA"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <TotpDisplay secret={decryptedEmailTwoFactor} copyToClipboard={copyToClipboard} label="邮箱 2FA 验证码" />
                      </div>
                    )}
                    {acc.verificationCode && (
                      <div className="mb-4">
                        <div className="relative group/verification">
                          <div className="flex items-stretch h-[38px]">
                            <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 text-xs font-bold px-3 rounded-l-lg border border-indigo-100 border-r-0">
                              验证码
                            </span>
                            <input
                              type="text"
                              readOnly
                              value={decryptedVerificationCode}
                              className="w-full text-sm bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100 rounded-r-lg px-3 text-indigo-700 outline-none font-mono transition-colors"
                              title="验证码"
                            />
                          </div>
                          <button
                            onClick={() => copyToClipboard(decryptedVerificationCode, '验证码')}
                            className="absolute right-1.5 top-1.5 p-1 bg-white border border-indigo-100 rounded text-indigo-400 hover:text-indigo-600 shadow-sm opacity-0 group-hover/verification:opacity-100 transition-opacity"
                            title="复制验证码"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 底部信息 (备注已实现自动换行，不再截断) */}
                    <div className="flex flex-col gap-2 text-sm mb-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 font-medium">成本: ¥{Number(acc.cost).toLocaleString()}</span>
                        {parseFloat(acc.income) > 0 ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                            已售: ¥{Number(acc.income).toLocaleString()}
                            {acc.soldDate && <span className="text-[10px] text-emerald-500 font-normal">({acc.soldDate})</span>}
                          </span>
                        ) : (
                          <span className="text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            待售中
                          </span>
                        )}
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
  const toastTimeoutRef = React.useRef(null);

  const showToast = React.useCallback((msg, duration = 2500) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (msg) toastTimeoutRef.current = setTimeout(() => setToastMessage(''), duration);
  }, []);

  useEffect(() => {
    const handleAuthExpired = (e) => {
      setIsAuthenticated(false);
      const msg = e.detail?.message || '登录会话已过期，请重新登录';
      showToast(msg, 3500);
    };
    window.addEventListener('oracle_finance_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('oracle_finance_auth_expired', handleAuthExpired);
  }, [showToast]);

  const handleLogout = async () => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {
        console.error('服务端登出通知失败:', e);
      }
    }
    sessionStorage.removeItem('oracle_finance_auth');
    sessionStorage.removeItem('token');
    localStorage.removeItem('oracle_finance_accounts');
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
          <Route path="/inventory" element={<AccountInventory setToastMessage={showToast} />} />

          {/* 默认重定向 */}
          <Route path="/" element={<Navigate to="/finance" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
