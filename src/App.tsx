import React, { useState } from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { Header } from './components/Header';
import { UserProfileCard } from './components/UserProfileCard';
import { RegisterSection } from './components/RegisterSection';
import { UpgradeRankSection } from './components/UpgradeRankSection';
import { RankInspectorAndAdminPanel } from './components/RankInspectorAndAdminPanel';
import { MatrixTreeVisualizer } from './components/MatrixTreeVisualizer';
import { EventLogsSection } from './components/EventLogsSection';
import { DeployContractModal } from './components/DeployContractModal';
import { CONTRACT_ADDRESS, USDT_ADDRESS } from './contracts/config';
import { ExternalLink, CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<'th' | 'en'>('th');
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'matrix' | 'events'>('actions');
  const [selectedInspectRank, setSelectedInspectRank] = useState<number>(1);
  const [selectedVaultBalance, setSelectedVaultBalance] = useState<string>('0.00 USDT');

  const {
    account,
    chainId,
    isBscTestnet,
    isConnecting,
    usdtBalance,
    bnbBalance,
    allowance,
    profile,
    isLoadingProfile,
    contractAddress,
    usdtAddress,
    updateSmartContractAddress,
    resetSmartContractAddress,
    txState,
    connectWallet,
    disconnectWallet,
    switchToBscTestnet,
    refreshUserData,
    checkSponsorNode,
    previewNextPlacement,
    inspectRankData,
    handleApproveUsdt,
    handleRegister,
    handleExecuteOffChainSimulationAndBatch,
    handleUpgradeRank,
    handleAdminUpgrade,
    handleProcessAutoNewMainId,
    handleProcessAutoExtraId,
    clearTxState,
  } = useWeb3();

  React.useEffect(() => {
    if (Array.isArray(profile?.vaults) && profile.vaults.length > 0) {
      const targetVault = profile.vaults.find((v: any) => Number(v.rank) === selectedInspectRank);
      if (targetVault) {
        setSelectedVaultBalance(`${Number(targetVault.balance || 0).toFixed(2)} USDT`);
      }
    }
  }, [profile?.vaults, selectedInspectRank]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0a0f1d] text-slate-100 flex flex-col justify-between font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header
        account={account}
        chainId={chainId}
        isBscTestnet={isBscTestnet}
        isConnecting={isConnecting}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        onSwitchNetwork={switchToBscTestnet}
        onRefresh={refreshUserData}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'th' ? 'en' : 'th')}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        contractAddress={contractAddress}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8 min-w-0">
        {/* Notification Toast Box */}
        {(txState.isLoading || txState.error || txState.successMessage) && (
          <div
            id="toastBox"
            className={`p-4 rounded-xl text-sm border transition-all duration-300 relative ${
              txState.isLoading
                ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-200'
                : txState.error
                ? 'bg-red-950/80 border-red-500/40 text-red-300'
                : 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <button
              onClick={clearTxState}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3">
              {txState.isLoading ? (
                <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
              ) : txState.error ? (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}

              <div className="space-y-1">
                <div className="font-semibold text-sm">
                  {txState.isLoading
                    ? language === 'th'
                      ? 'กำลังทำรายการบนบล็อกเชน (Pending Transaction)...'
                      : 'Transaction in Progress...'
                    : txState.error
                    ? language === 'th'
                      ? 'เกิดข้อผิดพลาดในการทำรายการ'
                      : 'Transaction Error'
                    : language === 'th'
                    ? 'ทำรายการสำเร็จเรียบร้อย!'
                    : 'Transaction Successful!'}
                </div>
                <div className="text-xs opacity-90">
                  {txState.step || txState.error || txState.successMessage}
                </div>
                {txState.txHash && (
                  <div className="pt-1">
                    <a
                      href={`https://testnet.bscscan.com/tx/${txState.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono underline hover:text-white flex items-center gap-1"
                    >
                      <span>
                        Tx: {txState.txHash.substring(0, 16)}...{txState.txHash.substring(56)}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Stats Overview (4 Top Cards: User Status, Current Max Rank, Rank 1 Node Info, Vault Balance) */}
        <UserProfileCard
          account={account}
          profile={profile}
          isLoading={isLoadingProfile}
          usdtBalance={usdtBalance}
          bnbBalance={bnbBalance}
          allowance={allowance}
          language={language}
          selectedInspectRank={selectedInspectRank}
          selectedVaultBalance={selectedVaultBalance}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('actions')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
              activeTab === 'actions'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {language === 'th' ? '⚡ แดชบอร์ดหลัก (Main DApp)' : '⚡ Main DApp Dashboard'}
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {language === 'th' ? '🌐 โครงสร้าง Binary Matrix 27' : '🌐 Binary Matrix 27 Visualizer'}
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`text-xs font-semibold px-4 py-2 rounded-xl transition shrink-0 cursor-pointer ${
              activeTab === 'events'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {language === 'th' ? '📡 ประวัติรางวัลสด (Live Events)' : '📡 Live Events Feed'}
          </button>
        </div>

        {/* Main 3-Column Interaction Grid + On-Chain Binary Matrix 27 Ranks Tree */}
        {activeTab === 'actions' && (
          <div className="space-y-8">
            <MatrixTreeVisualizer
              language={language}
              userAddress={account}
              chainId={chainId}
              isBscTestnet={isBscTestnet}
              contractAddress={contractAddress}
              onConnectWallet={connectWallet}
              onSwitchNetwork={switchToBscTestnet}
              onRegisterWithSponsor={handleRegister}
              onUpgradeToRank={handleUpgradeRank}
              lastTxSuccess={txState.successMessage}
              refreshTrigger={txState.successMessage}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Columns 1 & 2: 1. Registration, 2. Rank Upgrade (1-27) */}
              <div className="lg:col-span-2 space-y-8">
                <RegisterSection
                  account={account}
                  isRegistered={profile?.isRegistered ?? false}
                  mainNodeIdRank1={profile?.mainNodeIdRank1}
                  usdtBalance={usdtBalance}
                  allowance={allowance}
                  onConnectWallet={connectWallet}
                  onApproveUsdt={handleApproveUsdt}
                  onRegister={handleRegister}
                  onExecuteOffChainBatch={handleExecuteOffChainSimulationAndBatch}
                  onCheckSponsor={checkSponsorNode}
                  onPreviewPlacement={previewNextPlacement}
                  isLoading={txState.isLoading}
                  currentStep={txState.step}
                  txError={txState.error}
                  txSuccess={txState.successMessage}
                  language={language}
                />

                <UpgradeRankSection
                  account={account}
                  currentRank={profile?.currentMaxRank ?? 0}
                  allowance={allowance}
                  onUpgrade={handleUpgradeRank}
                  onProcessAutoNewMainId={handleProcessAutoNewMainId}
                  onProcessAutoExtraId={handleProcessAutoExtraId}
                  isLoading={txState.isLoading}
                  currentStep={txState.step}
                  language={language}
                  vault1To4Balance={
                    Array.isArray(profile?.vaults)
                      ? profile.vaults
                          .filter((v: any) => v.rank >= 1 && v.rank <= 4)
                          .reduce((acc: number, curr: any) => acc + parseFloat(curr.balance || '0'), 0)
                      : 0
                  }
                  vault4ToMaxBalance={
                    Array.isArray(profile?.vaults)
                      ? profile.vaults
                          .filter((v: any) => v.rank >= 4 && v.rank <= 27)
                          .reduce((acc: number, curr: any) => acc + parseFloat(curr.balance || '0'), 0)
                      : 0
                  }
                />
              </div>

              {/* Column 3: Rank Inspector, Admin Controls & Live Events */}
              <div className="space-y-8">
                <RankInspectorAndAdminPanel
                  account={account}
                  language={language}
                  selectedInspectRank={selectedInspectRank}
                  onSelectInspectRank={setSelectedInspectRank}
                  onInspectRank={inspectRankData}
                  onRefreshOnChainData={refreshUserData}
                  onAdminUpgrade={handleAdminUpgrade}
                  onVaultBalanceChange={setSelectedVaultBalance}
                  isLoading={txState.isLoading}
                  contractAddress={contractAddress}
                  usdtAddress={usdtAddress}
                  onUpdateContractAddress={updateSmartContractAddress}
                  onResetContractAddress={resetSmartContractAddress}
                />

                <EventLogsSection language={language} account={account} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matrix' && (
          <div className="space-y-6">
            <MatrixTreeVisualizer
              language={language}
              userAddress={account}
              chainId={chainId}
              isBscTestnet={isBscTestnet}
              contractAddress={contractAddress}
              onConnectWallet={connectWallet}
              onSwitchNetwork={switchToBscTestnet}
              onRegisterWithSponsor={handleRegister}
              onUpgradeToRank={handleUpgradeRank}
              lastTxSuccess={txState.successMessage}
              refreshTrigger={txState.successMessage}
            />
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <EventLogsSection language={language} account={account} />
          </div>
        )}

        <DeployContractModal
          isOpen={isDeployModalOpen}
          onClose={() => setIsDeployModalOpen(false)}
          language={language}
          onUpdateContractAddress={updateSmartContractAddress}
        />
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 py-6 px-4 mt-12 text-center text-xs text-slate-500 break-words">
        <p className="flex flex-wrap items-center justify-center gap-1.5">
          <span>FractalFlowMatrix27 Smart Contract (Active):</span>
          <a
            href={`https://testnet.bscscan.com/address/${contractAddress || CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 font-mono hover:underline break-all"
          >
            {contractAddress || CONTRACT_ADDRESS}
          </a>
        </p>
        <p className="mt-1.5">
          BNB Smart Chain Testnet • Dynamic Database Configuration • USDT:{' '}
          <a
            href={`https://testnet.bscscan.com/address/${usdtAddress || USDT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 font-mono hover:underline"
          >
            {(usdtAddress || USDT_ADDRESS).substring(0, 10)}...
          </a>
        </p>
      </footer>
    </div>
  );
}
