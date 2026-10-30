import React, { useState, useEffect } from 'react';
import { useWeb3 } from './hooks/useWeb3';
import { Header } from './components/Header';
import { UserProfileCard } from './components/UserProfileCard';
import { RegisterSection } from './components/RegisterSection';
import { UpgradeRankSection } from './components/UpgradeRankSection';
import { RankInspectorAndAdminPanel } from './components/RankInspectorAndAdminPanel';
import { MatrixTreeVisualizer } from './components/MatrixTreeVisualizer';
import { EventLogsSection } from './components/EventLogsSection';
import { DeployContractModal } from './components/DeployContractModal';
import { AuthAndOnboardingGate } from './components/AuthAndOnboardingGate';
import { CONTRACT_ADDRESS, USDT_ADDRESS } from './contracts/config';
import { AlertCircle, CheckCircle2, Loader2, X, ExternalLink, LogIn } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<'th' | 'en'>('th');
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [selectedInspectRank, setSelectedInspectRank] = useState<number>(1);
  const [selectedVaultBalance, setSelectedVaultBalance] = useState<string>('0.00 USDT');
  const [bypassGateToDashboard, setBypassGateToDashboard] = useState<boolean>(false);

  const {
    account,
    detectedBrowserWallet,
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
    loginWithCustomInput,
    loginWithDemoUnregisteredWallet,
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

  // Check if connected wallet is already registered on-chain
  const isWalletRegistered = Boolean(
    profile?.isRegistered ||
      (profile?.ownedAllIdsRank1 && profile.ownedAllIdsRank1.length > 0) ||
      (profile?.mainNodeIdRank1 && Number(profile.mainNodeIdRank1) > 0)
  );

  // Whenever account changes, reset bypass so unregistered wallets see the registration form
  useEffect(() => {
    setBypassGateToDashboard(false);
  }, [account]);

  useEffect(() => {
    if (Array.isArray(profile?.vaults) && profile.vaults.length > 0) {
      const targetVault = profile.vaults.find((v: any) => Number(v.rank) === selectedInspectRank);
      if (targetVault) {
        setSelectedVaultBalance(`${Number(targetVault.balance || 0).toFixed(2)} USDT`);
      }
    }
  }, [profile?.vaults, selectedInspectRank]);

  const handleFullLogout = () => {
    setBypassGateToDashboard(false);
    disconnectWallet();
  };

  // Show Login Gate when no wallet is connected, or Onboarding Registration Form when wallet is not registered
  if (!bypassGateToDashboard) {
    if (!account) {
      return (
        <AuthAndOnboardingGate
          mode="login"
          language={language}
          onToggleLanguage={() => setLanguage(language === 'th' ? 'en' : 'th')}
          account={account}
          detectedBrowserWallet={detectedBrowserWallet}
          chainId={chainId}
          isBscTestnet={isBscTestnet}
          isConnecting={isConnecting}
          isLoadingProfile={isLoadingProfile}
          profile={profile}
          usdtBalance={usdtBalance}
          bnbBalance={bnbBalance}
          allowance={allowance}
          contractAddress={contractAddress || CONTRACT_ADDRESS}
          usdtAddress={usdtAddress || USDT_ADDRESS}
          txState={txState}
          onClearTxState={clearTxState}
          onConnectWallet={connectWallet}
          onLoginCustomInput={loginWithCustomInput}
          onLoginDemoUnregisteredWallet={loginWithDemoUnregisteredWallet}
          onDisconnect={handleFullLogout}
          onSwitchNetwork={switchToBscTestnet}
          onRefresh={refreshUserData}
          onEnterGuestDashboard={() => setBypassGateToDashboard(true)}
          onApproveUsdt={handleApproveUsdt}
          onRegister={handleRegister}
          onExecuteOffChainBatch={handleExecuteOffChainSimulationAndBatch}
          onCheckSponsor={checkSponsorNode}
          onPreviewPlacement={previewNextPlacement}
          onUpgradeToRank={handleUpgradeRank}
        />
      );
    }

    if (isLoadingProfile && !profile) {
      return (
        <AuthAndOnboardingGate
          mode="Checking"
          language={language}
          onToggleLanguage={() => setLanguage(language === 'th' ? 'en' : 'th')}
          account={account}
          detectedBrowserWallet={detectedBrowserWallet}
          chainId={chainId}
          isBscTestnet={isBscTestnet}
          isConnecting={isConnecting}
          isLoadingProfile={isLoadingProfile}
          profile={profile}
          usdtBalance={usdtBalance}
          bnbBalance={bnbBalance}
          allowance={allowance}
          contractAddress={contractAddress || CONTRACT_ADDRESS}
          usdtAddress={usdtAddress || USDT_ADDRESS}
          txState={txState}
          onClearTxState={clearTxState}
          onConnectWallet={connectWallet}
          onLoginCustomInput={loginWithCustomInput}
          onLoginDemoUnregisteredWallet={loginWithDemoUnregisteredWallet}
          onDisconnect={handleFullLogout}
          onSwitchNetwork={switchToBscTestnet}
          onRefresh={refreshUserData}
          onEnterGuestDashboard={() => setBypassGateToDashboard(true)}
          onApproveUsdt={handleApproveUsdt}
          onRegister={handleRegister}
          onExecuteOffChainBatch={handleExecuteOffChainSimulationAndBatch}
          onCheckSponsor={checkSponsorNode}
          onPreviewPlacement={previewNextPlacement}
          onUpgradeToRank={handleUpgradeRank}
        />
      );
    }

    if (!isLoadingProfile && !isWalletRegistered) {
      return (
        <AuthAndOnboardingGate
          mode="register_onboarding"
          language={language}
          onToggleLanguage={() => setLanguage(language === 'th' ? 'en' : 'th')}
          account={account}
          detectedBrowserWallet={detectedBrowserWallet}
          chainId={chainId}
          isBscTestnet={isBscTestnet}
          isConnecting={isConnecting}
          isLoadingProfile={isLoadingProfile}
          profile={profile}
          usdtBalance={usdtBalance}
          bnbBalance={bnbBalance}
          allowance={allowance}
          contractAddress={contractAddress || CONTRACT_ADDRESS}
          usdtAddress={usdtAddress || USDT_ADDRESS}
          txState={txState}
          onClearTxState={clearTxState}
          onConnectWallet={connectWallet}
          onLoginCustomInput={loginWithCustomInput}
          onLoginDemoUnregisteredWallet={loginWithDemoUnregisteredWallet}
          onDisconnect={handleFullLogout}
          onSwitchNetwork={switchToBscTestnet}
          onRefresh={refreshUserData}
          onEnterGuestDashboard={() => setBypassGateToDashboard(true)}
          onApproveUsdt={handleApproveUsdt}
          onRegister={handleRegister}
          onExecuteOffChainBatch={handleExecuteOffChainSimulationAndBatch}
          onCheckSponsor={checkSponsorNode}
          onPreviewPlacement={previewNextPlacement}
          onUpgradeToRank={handleUpgradeRank}
        />
      );
    }
  }

  const vault1To4Balance = Array.isArray(profile?.vaults)
    ? profile.vaults
        .filter((v) => v.rank >= 1 && v.rank <= 4)
        .reduce((acc, curr) => acc + parseFloat(curr.balance || '0'), 0)
    : 0;

  const vault4ToMaxBalance = Array.isArray(profile?.vaults)
    ? profile.vaults
        .filter((v) => v.rank >= 4 && v.rank <= 27)
        .reduce((acc, curr) => acc + parseFloat(curr.balance || '0'), 0)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header
        account={account}
        chainId={chainId}
        isBscTestnet={isBscTestnet}
        isConnecting={isConnecting}
        onConnect={connectWallet}
        onDisconnect={handleFullLogout}
        onSwitchNetwork={switchToBscTestnet}
        onRefresh={refreshUserData}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'th' ? 'en' : 'th')}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        contractAddress={contractAddress}
      />

      {/* Quick Banner when browsing in Guest / Bypass mode */}
      {(!account || !isWalletRegistered) && (
        <div className="bg-indigo-950/60 border-b border-indigo-500/30 px-3 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-indigo-200">
              {!account
                ? language === 'th'
                  ? 'โหมดดูข้อมูล (ยังไม่ได้เข้าสู่ระบบ)'
                  : 'Guest Preview Mode (Not logged in)'
                : language === 'th'
                ? 'กระเป๋านี้ยังไม่ได้ลงทะเบียนรหัสสมาชิก'
                : 'This wallet is not registered yet'}
            </span>
            <button
              onClick={() => setBypassGateToDashboard(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>
                {!account
                  ? language === 'th'
                    ? 'กลับไปหน้าเข้าสู่ระบบ / สมัครสมาชิก'
                    : 'Back to Login / Register'
                  : language === 'th'
                  ? 'เปิดฟอร์มสมัครสมาชิก'
                  : 'Open Registration Form'}
              </span>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        {/* Global Transaction Status Toast / Banner */}
        {(txState.isLoading || txState.error || txState.successMessage) && (
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-lg ${
              txState.error
                ? 'bg-red-950/50 border-red-500/40 text-red-200'
                : txState.successMessage
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-900/90 border-indigo-500/40 text-indigo-200'
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
              {txState.isLoading && (
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0 mt-0.5" />
              )}
              {txState.error && (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              {txState.successMessage && !txState.isLoading && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}

              <div className="text-xs sm:text-sm space-y-1 min-w-0">
                <p className="font-semibold break-words">
                  {txState.error ||
                    txState.successMessage ||
                    (language === 'th'
                      ? 'กำลังดำเนินการธุรกรรมบนบล็อกเชน...'
                      : 'Processing blockchain transaction...')}
                </p>
                {txState.txHash && (
                  <a
                    href={`https://testnet.bscscan.com/tx/${txState.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs underline opacity-90 hover:opacity-100 font-mono"
                  >
                    <span>Tx: {txState.txHash.slice(0, 10)}...</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {!txState.isLoading && (
              <button
                onClick={clearTxState}
                className="p-1 rounded-lg hover:bg-white/10 transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* User Profile & Balances */}
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

        {/* Registration & Upgrade Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
          <div className="lg:col-span-5">
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
          </div>

          <div className="lg:col-span-7">
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
              vault1To4Balance={vault1To4Balance}
              vault4ToMaxBalance={vault4ToMaxBalance}
            />
          </div>
        </div>

        {/* Binary Matrix Tree Visualizer */}
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

        {/* Rank Inspector & Admin Panel */}
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

        {/* On-Chain Event Logs */}
        <EventLogsSection language={language} account={account} />
      </main>

      <DeployContractModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        language={language}
        onUpdateContractAddress={updateSmartContractAddress}
      />
    </div>
  );
}
