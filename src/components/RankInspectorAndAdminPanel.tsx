import React, { useState, useEffect } from 'react';
import { RANK_PRICES_USDT } from '../contracts/config';
import { RefreshCw, ShieldAlert, Search, Database, Save, RotateCcw, ExternalLink, Check, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

interface RankInspectorAndAdminPanelProps {
  account: string | null;
  language: 'th' | 'en';
  selectedInspectRank: number;
  onSelectInspectRank: (rank: number) => void;
  onInspectRank: (rank: number) => Promise<{
    firstNodeId: string;
    latestNodeId: string;
    upgradeVaultBalance: string;
    nextRankPrice: string;
  }>;
  onRefreshOnChainData: () => void;
  onAdminUpgrade: (targetUser: string, targetRank: number) => Promise<any>;
  onVaultBalanceChange?: (vaultStr: string) => void;
  isLoading: boolean;
  contractAddress?: string;
  usdtAddress?: string;
  onUpdateContractAddress?: (newContract: string, newUsdt?: string) => Promise<boolean>;
  onResetContractAddress?: () => Promise<boolean>;
}

export const RankInspectorAndAdminPanel: React.FC<RankInspectorAndAdminPanelProps> = ({
  account,
  language,
  selectedInspectRank,
  onSelectInspectRank,
  onInspectRank,
  onRefreshOnChainData,
  onAdminUpgrade,
  onVaultBalanceChange,
  isLoading,
  contractAddress,
  usdtAddress,
  onUpdateContractAddress,
  onResetContractAddress,
}) => {
  const [rankStats, setRankStats] = useState<{
    firstNodeId: string;
    latestNodeId: string;
    upgradeVaultBalance: string;
    nextRankPrice: string;
  }>({
    firstNodeId: '-',
    latestNodeId: '-',
    upgradeVaultBalance: '0.00',
    nextRankPrice: '10.00 USDT',
  });

  const [adminUserAddr, setAdminUserAddr] = useState<string>('');
  const [adminTargetRankText, setAdminTargetRankText] = useState<string>('2');
  const [isRefreshingRank, setIsRefreshingRank] = useState<boolean>(false);

  // Smart Contract Database Management State
  const [editingContract, setEditingContract] = useState<string>(contractAddress || '');
  const [editingUsdt, setEditingUsdt] = useState<string>(usdtAddress || '');
  const [isSavingContract, setIsSavingContract] = useState<boolean>(false);
  const [contractSaveMsg, setContractSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);

  useEffect(() => {
    if (contractAddress) setEditingContract(contractAddress);
  }, [contractAddress]);

  useEffect(() => {
    if (usdtAddress) setEditingUsdt(usdtAddress);
  }, [usdtAddress]);

  const loadRankInfo = async (rank: number) => {
    setIsRefreshingRank(true);
    try {
      const info = await onInspectRank(rank);
      setRankStats(info);
      if (onVaultBalanceChange) {
        onVaultBalanceChange(`${info.upgradeVaultBalance} USDT`);
      }
    } finally {
      setIsRefreshingRank(false);
    }
  };

  useEffect(() => {
    loadRankInfo(selectedInspectRank);
  }, [selectedInspectRank, account]);

  const handleRankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRank = Number(e.target.value);
    onSelectInspectRank(newRank);
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUserAddr) return;
    const parsedRank = Math.min(27, Math.max(2, parseInt(adminTargetRankText.replace(/[^0-9]/g, ''), 10) || 2));
    setAdminTargetRankText(String(parsedRank));
    onAdminUpgrade(adminUserAddr.trim(), parsedRank);
  };

  return (
    <div className="space-y-8">
      {/* 4. Rank Inspector */}
      <div className="bg-slate-900/90 border border-emerald-500/20 p-6 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.12)] space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-400" />
            <span>{language === 'th' ? '4. ตรวจสอบแรงค์ (Rank Inspector)' : '4. Rank Inspector'}</span>
          </h2>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-mono">
            Rank {selectedInspectRank}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">
              {language === 'th' ? 'เลือกแรงค์ที่ต้องการตรวจสอบ (Choose Rank to Inspect)' : 'Choose Rank to Inspect'}
            </label>
            <select
              id="inspectRankSelect"
              value={selectedInspectRank}
              onChange={handleRankChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              {RANK_PRICES_USDT.map((price, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  Rank {idx + 1} ({price.toLocaleString()} USDT)
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">First Node ID:</span>
              <span id="inspectFirstId" className="font-mono font-bold text-emerald-400">
                {rankStats.firstNodeId}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Latest Node ID:</span>
              <span id="inspectLatestId" className="font-mono font-bold text-teal-400">
                {rankStats.latestNodeId}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Upgrade Vault Balance:</span>
              <span id="inspectVault" className="font-mono font-bold text-amber-400">
                {rankStats.upgradeVaultBalance} USDT
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-slate-800 pt-2">
              <span className="text-slate-400">Next Rank Price:</span>
              <span id="inspectNextPrice" className="font-mono font-bold text-slate-200">
                {rankStats.nextRankPrice}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onRefreshOnChainData();
              loadRankInfo(selectedInspectRank);
            }}
            disabled={isRefreshingRank}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition duration-200 text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRank ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{language === 'th' ? '🔄 รีเฟรชข้อมูลบนเชน (Refresh On-Chain Data)' : '🔄 Refresh On-Chain Data'}</span>
          </button>
        </div>
      </div>

      {/* 5. Admin Controls */}
      <div className="bg-slate-900/90 border border-emerald-500/20 p-6 rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.12)] space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>{language === 'th' ? '5. Admin Controls' : '5. Admin Controls'}</span>
          </h2>
        </div>

        <form onSubmit={handleAdminSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>Target User Address</span>
              {account && (
                <button
                  type="button"
                  onClick={() => setAdminUserAddr(account)}
                  className="text-[10px] text-emerald-400 hover:underline normal-case"
                >
                  {language === 'th' ? 'ใส่กระเป๋าของฉัน' : 'Use My Address'}
                </button>
              )}
            </label>
            <input
              type="text"
              id="adminUserAddr"
              value={adminUserAddr}
              onChange={(e) => setAdminUserAddr(e.target.value)}
              placeholder="0x..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                Target Rank (2-27)
              </label>
              <input
                type="text"
                inputMode="numeric"
                id="adminTargetRank"
                value={adminTargetRankText}
                onChange={(e) => setAdminTargetRankText(e.target.value)}
                placeholder="เช่น 2 - 27"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading || !adminUserAddr}
                className="w-full bg-red-600/80 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition duration-200 text-xs cursor-pointer disabled:opacity-50"
              >
                Admin Upgrade
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 6. Smart Contract Address & Database Manager */}
      <div className="bg-slate-900/90 border border-indigo-500/30 p-6 rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.12)] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>{language === 'th' ? '6. จัดการที่อยู่ Smart Contract' : '6. Smart Contract Manager'}</span>
          </h2>
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Database Active</span>
          </span>
        </div>

        {/* Current Active Contract Display */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">
              {language === 'th' ? 'สัญญาปัจจุบันใน Database:' : 'Current Contract in DB:'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (contractAddress) {
                    navigator.clipboard.writeText(contractAddress);
                    setCopiedAddr(true);
                    setTimeout(() => setCopiedAddr(false), 2000);
                  }
                }}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 p-1 bg-slate-800 rounded transition cursor-pointer"
              >
                {copiedAddr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedAddr ? (language === 'th' ? 'คัดลอกแล้ว' : 'Copied') : (language === 'th' ? 'คัดลอก' : 'Copy')}</span>
              </button>
              {contractAddress && (
                <a
                  href={`https://testnet.bscscan.com/address/${contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <div className="font-mono text-xs text-amber-300 break-all select-all">
            {contractAddress || '-'}
          </div>
          {usdtAddress && (
            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-900 font-mono">
              USDT Token: <span className="text-slate-300 select-all">{usdtAddress}</span>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editingContract.trim()) return;
            setIsSavingContract(true);
            setContractSaveMsg(null);
            try {
              if (onUpdateContractAddress) {
                const ok = await onUpdateContractAddress(editingContract.trim(), editingUsdt.trim() || undefined);
                if (ok) {
                  setContractSaveMsg({
                    type: 'success',
                    text: language === 'th' ? 'บันทึกลง Database เรียบร้อยแล้ว' : 'Saved to database successfully',
                  });
                  setTimeout(() => setContractSaveMsg(null), 4000);
                } else {
                  setContractSaveMsg({
                    type: 'error',
                    text: language === 'th' ? 'บันทึกไม่สำเร็จ ตรวจสอบรูปแบบ Address' : 'Failed to save, check address format',
                  });
                }
              }
            } finally {
              setIsSavingContract(false);
            }
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
              {language === 'th' ? 'เลขที่อยู่ Smart Contract ใหม่ (EVM Address)' : 'New Smart Contract Address'}
            </label>
            <input
              type="text"
              value={editingContract}
              onChange={(e) => setEditingContract(e.target.value)}
              placeholder="0x..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
              {language === 'th' ? 'เลขที่อยู่ USDT Token (เว้นว่างไว้หากใช้ค่าเดิม)' : 'USDT Token Address (Optional)'}
            </label>
            <input
              type="text"
              value={editingUsdt}
              onChange={(e) => setEditingUsdt(e.target.value)}
              placeholder="0x..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {contractSaveMsg && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                contractSaveMsg.type === 'success'
                  ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
              }`}
            >
              {contractSaveMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{contractSaveMsg.text}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSavingContract || !editingContract.trim()}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold py-2.5 rounded-xl transition duration-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingContract ? (language === 'th' ? 'กำลังบันทึกลง Database...' : 'Saving to Database...') : (language === 'th' ? '💾 บันทึกที่อยู่สัญญาลง Database' : '💾 Save to Database')}</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (onResetContractAddress) {
                  setIsSavingContract(true);
                  setContractSaveMsg(null);
                  try {
                    const ok = await onResetContractAddress();
                    if (ok) {
                      setContractSaveMsg({
                        type: 'success',
                        text: language === 'th' ? 'คืนค่าเริ่มต้นสำเร็จ' : 'Reset to default successfully',
                      });
                      setTimeout(() => setContractSaveMsg(null), 4000);
                    }
                  } finally {
                    setIsSavingContract(false);
                  }
                }
              }}
              disabled={isSavingContract}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title={language === 'th' ? 'คืนค่าสัญญาเป็นค่าเริ่มต้น' : 'Reset to default contract'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'th' ? 'คืนค่า' : 'Reset'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
