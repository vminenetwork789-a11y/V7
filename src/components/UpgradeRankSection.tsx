import React, { useState, useEffect } from 'react';
import { RANK_DEFINITIONS } from '../contracts/config';
import { Zap, Check, ArrowUpRight, Sparkles, Layers } from 'lucide-react';

interface UpgradeRankSectionProps {
  account: string | null;
  currentRank: number;
  allowance: string;
  onUpgrade: (targetRank: number) => Promise<any>;
  onProcessAutoNewMainId?: () => Promise<any>;
  onProcessAutoExtraId?: (currentRank: number) => Promise<any>;
  isLoading: boolean;
  currentStep: string;
  language: 'th' | 'en';
  vault1To4Balance?: number;
  vault4ToMaxBalance?: number;
}

export const UpgradeRankSection: React.FC<UpgradeRankSectionProps> = ({
  account,
  currentRank,
  onUpgrade,
  onProcessAutoNewMainId,
  onProcessAutoExtraId,
  isLoading,
  currentStep,
  language,
  vault1To4Balance = 0,
  vault4ToMaxBalance = 0,
}) => {
  const nextStepRank = Math.min(Math.max(2, (currentRank || 1) + 1), 27);
  const [selectedRank, setSelectedRank] = useState<number>(nextStepRank);
  const [tierGroupTab, setTierGroupTab] = useState<'Starter (1-10)' | 'Growth (11-20)' | 'Whale (21-27)'>('Starter (1-10)');
  const [showAutoIdInfo, setShowAutoIdInfo] = useState<boolean>(false);

  useEffect(() => {
    const nextR = Math.min(Math.max(2, (currentRank || 1) + 1), 27);
    setSelectedRank(nextR);
    if (nextR <= 10) setTierGroupTab('Starter (1-10)');
    else if (nextR <= 20) setTierGroupTab('Growth (11-20)');
    else setTierGroupTab('Whale (21-27)');
  }, [currentRank]);

  const targetRankDef = RANK_DEFINITIONS.find((r) => r.rank === selectedRank);

  const handleUpgradeClick = () => {
    if (!account) {
      return;
    }
    onUpgrade(selectedRank);
  };

  const visibleRanks = RANK_DEFINITIONS.filter((r) => r.rank >= 2 && r.tierGroup === tierGroupTab);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-indigo-400">
              {language === 'th' ? '🚀 อัปเกรดแรงค์ 2 - 27 (upgradeRank)' : '🚀 Rank Progression (Rank 2 - 27)'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
              Step-by-Step + Vault Credit
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'th'
              ? 'อัปเกรดเรียงตามลำดับขั้น (currentRank + 1) ระบบหักยอดสะสมจาก getAccumulatedVault อัตโนมัติ'
              : 'Step-by-step upgrade (currentRank + 1) with automatic deduction from getAccumulatedVault'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{language === 'th' ? 'แรงค์ปัจจุบัน:' : 'Current:'}</span>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 border border-slate-700">
            Rank {currentRank || 0} / 27
          </span>
        </div>
      </div>

      {/* Tier Group Tabs (Ranks 2-10, 11-20, 21-27) */}
      <div className="flex items-center gap-1.5 mt-4 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
        {(['Starter (1-10)', 'Growth (11-20)', 'Whale (21-27)'] as const).map((group) => (
          <button
            key={group}
            type="button"
            onClick={() => setTierGroupTab(group)}
            className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition cursor-pointer ${
              tierGroupTab === group ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Rank Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4 max-h-60 overflow-y-auto pr-1">
        {visibleRanks.map((r) => {
          const isCurrent = currentRank === r.rank;
          const isPassed = currentRank > r.rank;
          const isNextStep = r.rank === (currentRank || 1) + 1;
          const isSelected = selectedRank === r.rank;

          return (
            <div
              key={r.rank}
              onClick={() => setSelectedRank(r.rank)}
              className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-indigo-950/50 border-indigo-500 shadow-lg shadow-indigo-950/50'
                  : isNextStep
                  ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              } ${isPassed ? 'opacity-65' : ''}`}
            >
              {isSelected && (
                <div className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white rounded-full p-0.5 shadow">
                  <Check className="w-3 h-3" />
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Rank {r.rank}</span>
                {isNextStep && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    Next Step
                  </span>
                )}
              </div>

              <div className="font-mono text-sm font-bold text-amber-400 mt-1">
                {r.priceUSDT.toLocaleString()} USDT
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span>Direct 30%:</span>
                  <span className="text-emerald-400">{(r.priceUSDT * 0.3).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vault 35%:</span>
                  <span className="text-indigo-300">{(r.priceUSDT * 0.35).toFixed(1)}</span>
                </div>
              </div>

              {isCurrent && (
                <div className="mt-1.5 text-center text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 py-0.5 rounded">
                  ✓ Active
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Rank Action Summary */}
      {targetRankDef && (
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-slate-200">
                  {language === 'th'
                    ? `อัปเกรดสู่ Rank ${targetRankDef.rank} (${targetRankDef.priceUSDT.toLocaleString()} USDT)`
                    : `Upgrade to Rank ${targetRankDef.rank} (${targetRankDef.priceUSDT.toLocaleString()} USDT)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'th'
                  ? `กระจายรางวัล: Direct ${(targetRankDef.priceUSDT * 0.3).toFixed(2)} | Level 15 ชั้น ${(targetRankDef.priceUSDT * 0.3).toFixed(2)} | Vault ${(targetRankDef.priceUSDT * 0.35).toFixed(2)} USDT`
                  : `Rewards: Direct ${(targetRankDef.priceUSDT * 0.3).toFixed(2)} | 15-Level ${(targetRankDef.priceUSDT * 0.3).toFixed(2)} | Vault ${(targetRankDef.priceUSDT * 0.35).toFixed(2)} USDT`}
              </p>
            </div>

            <button
              onClick={handleUpgradeClick}
              disabled={isLoading || !account}
              className="w-full sm:w-auto min-w-[190px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 px-5 rounded-xl transition duration-200 text-xs shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="truncate">{currentStep || 'Upgrading...'}</span>
                </>
              ) : (
                <>
                  <span>
                    {language === 'th'
                      ? `อัปเกรดสู่ Rank ${selectedRank} (${targetRankDef.priceUSDT.toLocaleString()} USDT)`
                      : `Upgrade Rank ${selectedRank} (${targetRankDef.priceUSDT.toLocaleString()} USDT)`}
                  </span>
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Smart Contract Auto-ID Triggers (checkAndProcessAutoNewMainId & checkAndProcessAutoExtraId) */}
          {(onProcessAutoNewMainId || onProcessAutoExtraId) && (() => {
            const targetExtraRank = Math.max(2, selectedRank);
            const targetExtraPrice = RANK_DEFINITIONS.find((r) => r.rank === targetExtraRank)?.priceUSDT || 10;
            const isExtraReady = (vault4ToMaxBalance || 0) >= targetExtraPrice;
            const isMainReady = (vault1To4Balance || 0) >= 5.0;

            return (
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'th' ? 'ปลดล็อก Auto ID จาก Vault (เงินแยก ไม่ใช้เงินกระเป๋า):' : 'Auto ID from Accumulated Vault (0 Wallet USDT):'}</span>
                      <button
                        type="button"
                        onClick={() => setShowAutoIdInfo(!showAutoIdInfo)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 underline ml-1 cursor-pointer"
                      >
                        {showAutoIdInfo ? (language === 'th' ? '✕ ซ่อนเงื่อนไข' : '✕ Hide Info') : (language === 'th' ? 'ℹ️ เงื่อนไขการเกิด' : 'ℹ️ Rules')}
                      </button>
                    </span>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                      <div>
                        <span className="text-slate-300 font-medium">Vault 1-4 (Main ID):</span>{' '}
                        <span className={isMainReady ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                          {(vault1To4Balance || 0).toFixed(2)} / 5.00 USDT
                        </span>{' '}
                        <span className="text-slate-400">
                          {isMainReady
                            ? '(✓ พร้อมออกรหัส)'
                            : `(ขาด ${(5.0 - (vault1To4Balance || 0)).toFixed(2)} U)`}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-300 font-medium">Vault 4-27 (Extra ID R{targetExtraRank}):</span>{' '}
                        <span className={isExtraReady ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                          {(vault4ToMaxBalance || 0).toFixed(2)} / {targetExtraPrice}.00 USDT
                        </span>{' '}
                        <span className="text-slate-400">
                          {isExtraReady
                            ? '(✓ พร้อมออกรหัส)'
                            : `(ขาด ${(Math.max(0, targetExtraPrice - (vault4ToMaxBalance || 0))).toFixed(2)} U)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onProcessAutoNewMainId?.()}
                      disabled={isLoading || !account}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border ${
                        isMainReady
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/30'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                      title={
                        isMainReady
                          ? 'กดเพื่อสร้าง Auto New Main ID จากยอดสะสม Vault 1-4 ทันที'
                          : `ยอดสะสมปัจจุบัน ${(vault1To4Balance || 0).toFixed(2)}/5.00 USDT (ยังไม่ถึงเกณฑ์ 5.00 USDT)`
                      }
                    >
                      <span className={`w-2 h-2 rounded-full ${isMainReady ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>
                        + Auto New Main ID ({(vault1To4Balance || 0).toFixed(2)}/5.00 U)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onProcessAutoExtraId?.(targetExtraRank)}
                      disabled={isLoading || !account}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 border ${
                        isExtraReady
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:bg-cyan-500/30'
                          : 'bg-slate-900 hover:bg-slate-800 text-cyan-300/80 border-cyan-500/30'
                      }`}
                      title={
                        isExtraReady
                          ? `กดเพื่อสร้าง Auto Extra ID สำหรับ Rank ${targetExtraRank} ทันที`
                          : `ยอดสะสม Vault 4-27 ปัจจุบัน ${(vault4ToMaxBalance || 0).toFixed(2)}/${targetExtraPrice}.00 USDT (ยังไม่ถึงเกณฑ์ ${targetExtraPrice} USDT)`
                      }
                    >
                      <span className={`w-2 h-2 rounded-full ${isExtraReady ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>
                        + Auto Extra ID (R{targetExtraRank}: {(vault4ToMaxBalance || 0).toFixed(2)}/{targetExtraPrice} U)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Collapsible Info Panel explaining Auto Extra ID conditions */}
                {showAutoIdInfo && (
                  <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-xs space-y-1.5 text-slate-300 animate-fadeIn">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === 'th' ? '📌 กฎและเงื่อนไขการทำงานของ Auto Extra ID:' : '📌 Rules & Conditions for Auto Extra ID:'}</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-slate-300 pl-3 list-disc marker:text-cyan-400">
                      <li>
                        <strong>{language === 'th' ? 'รองรับเฉพาะ Rank 2 ถึง Rank 27:' : 'Supported for Rank 2 to 27 only:'}</strong>{' '}
                        {language === 'th' ? 'ผัง Rank 1 ใช้วงจร Auto New Main ID จากกระปุก Vault 1-4' : 'Rank 1 uses Auto New Main ID from Vault 1-4.'}
                      </li>
                      <li>
                        <strong>{language === 'th' ? 'แหล่งเงินทุน:' : 'Source of Funds:'}</strong>{' '}
                        {language === 'th'
                          ? 'สัญญา Smart Contract ดึงเงินจากกระปุก Upgrade Vault (35%) ของลูกทีมฝั่งซ้ายใน Rank 4 ถึง 27 เท่านั้น'
                          : 'Smart contract draws funds from Upgrade Vault (35%) of left children in Rank 4 to 27 only.'}
                      </li>
                      <li>
                        <strong>{language === 'th' ? 'เกณฑ์ยอดเงินขั้นต่ำ:' : 'Required Threshold:'}</strong>{' '}
                        {language === 'th'
                          ? `ต้องมียอดสะสมใน Vault 4-27 ครบตามราคาของ Rank ที่ต้องการ (เช่น Rank 2 = 10 USDT, Rank 3 = 20 USDT, Rank ${targetExtraRank} = ${targetExtraPrice} USDT)`
                          : `Must have accumulated Vault 4-27 balance equal to the Rank price (e.g. Rank 2 = 10 USDT, Rank ${targetExtraRank} = ${targetExtraPrice} USDT).`}
                      </li>
                      <li>
                        <strong>{language === 'th' ? 'เงินแยกชัดเจน:' : 'Segregated Vault:'}</strong>{' '}
                        {language === 'th'
                          ? 'ไม่หักเหรียญ USDT ส่วนตัวในกระเป๋าของคุณแม้แต่เซนต์เดียว หากยอดเงินยังไม่ครบ สัญญาจะไม่สร้างโหนดเพื่อป้องกันการเสียแก๊สฟรี'
                          : 'Never deducts personal USDT from your wallet. If insufficient, contract preserves your funds.'}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
