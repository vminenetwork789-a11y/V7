import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESS,
  USDT_ADDRESS,
  DEFAULT_CONTRACT_ADDRESS,
  DEFAULT_USDT_ADDRESS,
  getDynamicContractAddress,
  getDynamicUsdtAddress,
  setDynamicContractConfig,
  clearDynamicContractConfig,
  BSC_TESTNET_RPC,
  BSC_TESTNET_CHAIN_ID,
  BSC_TESTNET_PARAMS,
  MATRIX_ABI,
  USDT_ABI,
  RANK_PRICES_USDT,
} from '../contracts/config';
import { UserProfile } from '../types';
import {
  executeOffChainSimulationAndBatch,
  previewOffChainSimulation,
  ApplicantItem,
  PlacementMode,
} from '../utils/offChainSimulator';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const readOnlyBscProvider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);

export function useWeb3() {
  const [contractAddress, setContractAddress] = useState<string>(() => getDynamicContractAddress());
  const [usdtAddress, setUsdtAddress] = useState<string>(() => getDynamicUsdtAddress());
  const contractAddressRef = useRef(contractAddress);
  const usdtAddressRef = useRef(usdtAddress);

  useEffect(() => {
    contractAddressRef.current = contractAddress;
  }, [contractAddress]);

  useEffect(() => {
    usdtAddressRef.current = usdtAddress;
  }, [usdtAddress]);

  const [account, setAccount] = useState<string | null>(null);
  const [detectedBrowserWallet, setDetectedBrowserWallet] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<string>('0.00');
  const [bnbBalance, setBnbBalance] = useState<string>('0.00');
  const [allowance, setAllowance] = useState<string>('0.00');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const [txState, setTxState] = useState<{
    isLoading: boolean;
    step: string;
    txHash: string | null;
    error: string | null;
    successMessage: string | null;
  }>({
    isLoading: false,
    step: '',
    txHash: null,
    error: null,
    successMessage: null,
  });

  const isBscTestnet = chainId === BSC_TESTNET_CHAIN_ID;

  const switchToBscTestnet = async (): Promise<boolean> => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_TESTNET_PARAMS.chainId }],
      });
      setChainId(BSC_TESTNET_CHAIN_ID);
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_TESTNET_PARAMS],
          });
          setChainId(BSC_TESTNET_CHAIN_ID);
          return true;
        } catch (addError) {
          console.error('Failed to add BSC Testnet to wallet:', addError);
          return false;
        }
      } else {
        console.error('Failed to switch to BSC Testnet:', switchError);
        return false;
      }
    }
  };

  const refreshUserData = useCallback(async (userAddr: string, overrideContract?: string, overrideUsdt?: string) => {
    if (!userAddr) return;
    setIsLoadingProfile(true);
    const targetContract = overrideContract || contractAddressRef.current;
    const targetUsdt = overrideUsdt || usdtAddressRef.current;
    try {
      // Always use BSC Testnet RPC for reading contract & USDT state reliably even if wallet chain hasn't switched yet
      let readProvider: ethers.Provider = readOnlyBscProvider;
      if (window.ethereum) {
        try {
          const browserProvider = new ethers.BrowserProvider(window.ethereum);
          const net = await browserProvider.getNetwork();
          setChainId(Number(net.chainId));
          if (Number(net.chainId) === BSC_TESTNET_CHAIN_ID) {
            readProvider = browserProvider;
          }
        } catch {
          readProvider = readOnlyBscProvider;
        }
      }

      const matrixContract = new ethers.Contract(targetContract, MATRIX_ABI, readProvider);
      const usdtContract = new ethers.Contract(targetUsdt, USDT_ABI, readProvider);

      try {
        const bnbWei = await readProvider.getBalance(userAddr);
        setBnbBalance(Number(ethers.formatEther(bnbWei)).toFixed(4));
      } catch {
        // Ignore balance error
      }

      let usdtDecimals = 6;
      try {
        usdtDecimals = Number(await usdtContract.decimals());
      } catch {
        usdtDecimals = 6;
      }

      try {
        const [uBal, uAllow] = await Promise.all([
          usdtContract.balanceOf(userAddr),
          usdtContract.allowance(userAddr, targetContract),
        ]);
        setUsdtBalance(Number(ethers.formatUnits(uBal, usdtDecimals)).toFixed(2));
        setAllowance(ethers.formatUnits(uAllow, usdtDecimals));
      } catch (usdtErr) {
        console.warn('USDT contract call notice:', usdtErr);
      }

      // Fetch backend profile & vaults as fallback only
      let backendVaults: any[] = [];
      let backendProfileFallback: UserProfile | null = null;
      try {
        const res = await fetch(`/api/user/${userAddr}`, {
          headers: { Accept: 'application/json' },
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.vaults) backendVaults = data.vaults;
          if (data.profile) {
            backendProfileFallback = { ...data.profile, vaults: data.vaults || [] };
          }
        }
      } catch {
        // Ignore backend error
      }

      // Fetch all Node IDs (Main IDs & Clone IDs) owned by this wallet in Rank 1 on-chain
      let ownedMainIdsRank1: string[] = [];
      let ownedCloneIdsRank1: string[] = [];
      let ownedAllIdsRank1: string[] = [];
      try {
        const totalNodesR1 = Number(await matrixContract.totalNodesInRank(1));
        if (totalNodesR1 > 0) {
          const lowerWallet = userAddr.toLowerCase();
          const nodeIds = Array.from({ length: totalNodesR1 }, (_, idx) => idx + 1);
          const nodeRecords = await Promise.all(
            nodeIds.map(async (id) => {
              try {
                const n = await matrixContract.rankNodes(1, id);
                return {
                  id: String(n.id ?? n[0]),
                  owner: String(n.owner ?? n[1] ?? '').toLowerCase(),
                  isClone: Boolean(n.isClone ?? n[6]),
                };
              } catch {
                return null;
              }
            })
          );
          for (const item of nodeRecords) {
            if (!item || item.id === '0') continue;
            if (item.owner === lowerWallet) {
              ownedAllIdsRank1.push(item.id);
              if (item.isClone) {
                ownedCloneIdsRank1.push(item.id);
              } else {
                ownedMainIdsRank1.push(item.id);
              }
            }
          }
        }
      } catch {
        // Ignore scan error
      }

      // Fetch on-chain UserProfile & Rank 1-27 Vaults from FractalFlowMatrix27.sol
      try {
        const profileData = await matrixContract.getUserProfile(userAddr);
        const onChainVaults = [];
        try {
          const rankIndices = Array.from({ length: 27 }, (_, i) => i + 1);
          const rankInfoResults = await Promise.allSettled(
            rankIndices.map((r) => matrixContract.getUserRankInfo(userAddr, r))
          );
          for (let i = 0; i < rankInfoResults.length; i++) {
            const res = rankInfoResults[i];
            if (res.status === 'fulfilled' && res.value) {
              const rank = i + 1;
              const rankInfo = res.value;
              onChainVaults.push({
                id: `v-chain-${rank}`,
                owner: userAddr,
                rank,
                balance: Number(ethers.formatUnits(rankInfo[2] ?? rankInfo.upgradeVaultBalance, usdtDecimals)).toFixed(2),
                firstNodeId: (rankInfo[0] ?? rankInfo.firstNodeId).toString(),
                latestNodeId: (rankInfo[1] ?? rankInfo.latestNodeId).toString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        } catch {
          // Fallback
        }

        const isRegisteredOnChain =
          Boolean(profileData.isRegistered) ||
          Number(profileData.mainNodeIdRank1 || 0) > 0 ||
          ownedAllIdsRank1.length > 0;

        const resolvedMainId =
          Number(profileData.mainNodeIdRank1 || 0) > 0
            ? profileData.mainNodeIdRank1.toString()
            : ownedMainIdsRank1[0] || ownedAllIdsRank1[0] || '0';

        const resolvedLatestCloneId =
          Number(profileData.latestCloneIdRank1 || 0) > 0
            ? profileData.latestCloneIdRank1.toString()
            : ownedCloneIdsRank1[ownedCloneIdsRank1.length - 1] || '0';

        setProfile({
          isRegistered: isRegisteredOnChain,
          sponsor: isRegisteredOnChain ? profileData.sponsor : ethers.ZeroAddress,
          sponsorMainNodeId: isRegisteredOnChain ? profileData.sponsorMainNodeId.toString() : '0',
          currentMaxRank: isRegisteredOnChain ? Math.max(1, Number(profileData.currentMaxRank || 1)) : 0,
          mainNodeIdRank1: isRegisteredOnChain ? resolvedMainId : '0',
          latestCloneIdRank1: isRegisteredOnChain ? resolvedLatestCloneId : '0',
          ownedMainIdsRank1: isRegisteredOnChain ? ownedMainIdsRank1 : [],
          ownedCloneIdsRank1: isRegisteredOnChain ? ownedCloneIdsRank1 : [],
          ownedAllIdsRank1: isRegisteredOnChain ? ownedAllIdsRank1 : [],
          vaults: isRegisteredOnChain ? (onChainVaults.length > 0 ? onChainVaults : backendVaults) : [],
        });
      } catch {
        // Fallback when getUserProfile is unavailable: rely on ownedAllIdsRank1 scan
        const isRegisteredByNodes = ownedAllIdsRank1.length > 0;
        if (isRegisteredByNodes) {
          setProfile({
            isRegistered: true,
            sponsor: backendProfileFallback?.sponsor || ethers.ZeroAddress,
            sponsorMainNodeId: backendProfileFallback?.sponsorMainNodeId || '1',
            currentMaxRank: backendProfileFallback?.currentMaxRank || 1,
            mainNodeIdRank1: ownedMainIdsRank1[0] || ownedAllIdsRank1[0] || '1',
            latestCloneIdRank1: ownedCloneIdsRank1[ownedCloneIdsRank1.length - 1] || '0',
            ownedMainIdsRank1,
            ownedCloneIdsRank1,
            ownedAllIdsRank1,
            vaults: backendVaults,
          });
        } else {
          setProfile({
            isRegistered: false,
            sponsor: ethers.ZeroAddress,
            sponsorMainNodeId: '0',
            currentMaxRank: 0,
            mainNodeIdRank1: '0',
            latestCloneIdRank1: '0',
            ownedMainIdsRank1: [],
            ownedCloneIdsRank1: [],
            ownedAllIdsRank1: [],
            vaults: [],
          });
        }
      }
    } catch (err) {
      console.error('Error refreshing user profile data:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const ensureWalletAndBscTestnet = async (): Promise<{
    provider: ethers.BrowserProvider;
    signer: ethers.Signer;
    userAddr: string;
  }> => {
    if (!window.ethereum) {
      throw new Error(
        'ไม่พบกระเป๋า Web3 (MetaMask / TrustWallet) ในเบราว์เซอร์ — หากเปิดอยู่ในหน้าต่าง Preview กรุณากดเปิดแอปในแท็บใหม่ (Open in New Tab) เพื่อเชื่อมต่อ MetaMask'
      );
    }

    let provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
      throw new Error('กรุณาอนุญาตการเชื่อมต่อบัญชีในกระเป๋า MetaMask');
    }

    const net = await provider.getNetwork();
    if (Number(net.chainId) !== BSC_TESTNET_CHAIN_ID) {
      setTxState((prev) => ({
        ...prev,
        isLoading: true,
        step: 'กำลังสลับเครือข่ายใน MetaMask เป็น BNB Smart Chain Testnet (Chain ID: 97)...',
      }));
      const switched = await switchToBscTestnet();
      if (!switched) {
        throw new Error('กรุณาสลับเครือข่ายในกระเป๋าเป็น BNB Smart Chain Testnet (Chain ID: 97) ก่อนทำรายการ');
      }
      provider = new ethers.BrowserProvider(window.ethereum);
    }

    const signer = await provider.getSigner();
    const userAddr = await signer.getAddress();
    setAccount(userAddr);
    setChainId(BSC_TESTNET_CHAIN_ID);

    return { provider, signer, userAddr };
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error:
          'ไม่พบกระเป๋า MetaMask หรือ Web3 Wallet — หากคุณใช้งานผ่านหน้าต่าง Preview กรุณากดเปิดลิงก์แอปในแท็บใหม่เพื่อเชื่อมต่อกระเป๋า',
        successMessage: null,
      });
      return;
    }
    setIsConnecting(true);
    try {
      const { userAddr } = await ensureWalletAndBscTestnet();
      try {
        sessionStorage.setItem('f27_active_wallet', userAddr);
      } catch {
        // Ignore storage error
      }
      await refreshUserData(userAddr);
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: err?.message || 'การเชื่อมต่อกระเป๋าล้มเหลว',
        successMessage: null,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const loginWithCustomInput = async (rawInput: string): Promise<boolean> => {
    const trimmed: string = String(rawInput || '').trim();
    if (!trimmed) return false;

    setIsConnecting(true);
    setTxState({
      isLoading: false,
      step: '',
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      // Case 1: Wallet Address (0x...)
      if (/^0x[a-fA-F0-9]{40}$/.test(trimmed) && ethers.isAddress(trimmed)) {
        const checksumAddr = ethers.getAddress(trimmed);
        setAccount(checksumAddr);
        try {
          sessionStorage.setItem('f27_active_wallet', checksumAddr);
        } catch {
          // Ignore
        }
        await refreshUserData(checksumAddr);
        return true;
      }

      // Case 2: Node ID (#1, 1, 2, etc.)
      const digitsOnly = trimmed.replace(/[^0-9]/g, '');
      const nodeIdNum = parseInt(digitsOnly, 10);
      if (Number.isFinite(nodeIdNum) && nodeIdNum >= 1) {
        const matrixContract = new ethers.Contract(contractAddressRef.current, MATRIX_ABI, readOnlyBscProvider);
        const totalNodesR1 = Number(await matrixContract.totalNodesInRank(1));
        if (nodeIdNum > totalNodesR1) {
          setTxState({
            isLoading: false,
            step: '',
            txHash: null,
            error: `ยังไม่พบรหัสสมาชิก #${nodeIdNum} ในสัญญาปัจจุบัน (ปัจจุบันมีทั้งหมด ${totalNodesR1} รหัส)`,
            successMessage: null,
          });
          return false;
        }
        const nodeData = await matrixContract.rankNodes(1, nodeIdNum);
        const ownerAddr = String(nodeData.owner ?? nodeData[1] ?? '');
        if (!ownerAddr || ownerAddr === ethers.ZeroAddress) {
          setTxState({
            isLoading: false,
            step: '',
            txHash: null,
            error: `ไม่พบเจ้าของกระเป๋าสำหรับรหัสสมาชิก #${nodeIdNum}`,
            successMessage: null,
          });
          return false;
        }
        const checksumAddr = ethers.getAddress(ownerAddr);
        setAccount(checksumAddr);
        try {
          sessionStorage.setItem('f27_active_wallet', checksumAddr);
        } catch {
          // Ignore
        }
        await refreshUserData(checksumAddr);
        return true;
      }

      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: 'กรุณากรอกที่อยู่กระเป๋า (0x...) หรือรหัสสมาชิก (เช่น 1, 2) ที่ถูกต้อง',
        successMessage: null,
      });
      return false;
    } catch (err: any) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: err?.message || 'ไม่สามารถตรวจสอบข้อมูลกระเป๋าได้',
        successMessage: null,
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const loginWithDemoUnregisteredWallet = async () => {
    setIsConnecting(true);
    try {
      const randomWallet = ethers.Wallet.createRandom();
      const newAddr = randomWallet.address;
      setAccount(newAddr);
      try {
        sessionStorage.setItem('f27_active_wallet', newAddr);
      } catch {
        // Ignore
      }
      await refreshUserData(newAddr);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    try {
      sessionStorage.removeItem('f27_active_wallet');
    } catch {
      // Ignore
    }
    setAccount(null);
    setProfile(null);
    setUsdtBalance('0.00');
    setAllowance('0.00');
  };

  // Load dynamic Smart Contract Address from Database/Backend on mount
  useEffect(() => {
    let isMounted = true;
    const fetchDbContractConfig = async () => {
      try {
        const res = await fetch('/api/config/contract');
        if (res.ok) {
          const data = await res.json();
          if (data?.config?.contractAddress && isMounted) {
            setContractAddress(data.config.contractAddress);
            contractAddressRef.current = data.config.contractAddress;
            if (data.config.usdtAddress) {
              setUsdtAddress(data.config.usdtAddress);
              usdtAddressRef.current = data.config.usdtAddress;
            }
            setDynamicContractConfig(data.config.contractAddress, data.config.usdtAddress);
          }
        }
      } catch (err) {
        console.warn('Notice fetching contract config from DB:', err);
      }
    };
    fetchDbContractConfig();

    const handleConfigUpdated = (e: any) => {
      if (e.detail?.contractAddress && isMounted) {
        setContractAddress(e.detail.contractAddress);
        contractAddressRef.current = e.detail.contractAddress;
        if (e.detail.usdtAddress) {
          setUsdtAddress(e.detail.usdtAddress);
          usdtAddressRef.current = e.detail.usdtAddress;
        }
        if (account) {
          refreshUserData(account, e.detail.contractAddress, e.detail.usdtAddress);
        }
      }
    };
    window.addEventListener('matrix:config:updated', handleConfigUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('matrix:config:updated', handleConfigUpdated);
    };
  }, [account, refreshUserData]);

  useEffect(() => {
    let savedSessionWallet: string | null = null;
    try {
      savedSessionWallet = sessionStorage.getItem('f27_active_wallet');
    } catch {
      savedSessionWallet = null;
    }

    if (!window.ethereum) {
      if (savedSessionWallet && ethers.isAddress(savedSessionWallet)) {
        setAccount(savedSessionWallet);
        refreshUserData(savedSessionWallet);
      }
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setDetectedBrowserWallet(accounts[0]);
        setAccount(accounts[0]);
        try {
          sessionStorage.setItem('f27_active_wallet', accounts[0]);
        } catch {
          // Ignore
        }
        refreshUserData(accounts[0]);
      } else {
        setDetectedBrowserWallet(null);
        disconnectWallet();
      }
    };

    const handleChainChanged = (chainHex: string) => {
      const newChainId = parseInt(chainHex, 16);
      setChainId(newChainId);
      if (account) {
        refreshUserData(account);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    const checkInitial = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
        if (accounts.length > 0) {
          const userAddr = accounts[0].address;
          setDetectedBrowserWallet(userAddr);
          if (savedSessionWallet && ethers.isAddress(savedSessionWallet)) {
            setAccount(savedSessionWallet);
            refreshUserData(savedSessionWallet);
          }
        } else if (savedSessionWallet && ethers.isAddress(savedSessionWallet)) {
          setAccount(savedSessionWallet);
          refreshUserData(savedSessionWallet);
        }
      } catch (e) {
        console.warn('Initial web3 check silent notice:', e);
        if (savedSessionWallet && ethers.isAddress(savedSessionWallet)) {
          setAccount(savedSessionWallet);
          refreshUserData(savedSessionWallet);
        }
      }
    };
    checkInitial();

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account, refreshUserData]);

  // Verify Sponsor Node ID via checkValidSponsorId(uint256) on BNB Smart Chain Testnet
  const checkSponsorNode = useCallback(
    async (sponsorNodeId: number): Promise<{ isValid: boolean; reason: string; sponsorAddress: string }> => {
      try {
        const matrixContract = new ethers.Contract(contractAddressRef.current, MATRIX_ABI, readOnlyBscProvider);
        const [isValid, reason, sponsorAddress] = await matrixContract.checkValidSponsorId(sponsorNodeId);
        return { isValid: Boolean(isValid), reason: String(reason), sponsorAddress: String(sponsorAddress) };
      } catch {
        return { isValid: sponsorNodeId >= 1, reason: 'Valid sponsor ID #1', sponsorAddress: contractAddressRef.current };
      }
    },
    []
  );

  // Preview Placement via previewPlacement(uint8, address) on BNB Smart Chain Testnet
  const previewNextPlacement = useCallback(async (rank: number, sponsorAddr: string) => {
    try {
      const matrixContract = new ethers.Contract(contractAddressRef.current, MATRIX_ABI, readOnlyBscProvider);
      const [targetParentId, isLeft, activeRound] = await matrixContract.previewPlacement(rank, sponsorAddr);
      return {
        targetParentId: targetParentId.toString(),
        isLeft: Boolean(isLeft),
        activeRound: Number(activeRound),
      };
    } catch {
      return null;
    }
  }, []);

  // Explicit Step 1: Approve USDT for Contract
  const handleApproveUsdt = async (amountUsdt = 100) => {
    setTxState({
      isLoading: true,
      step: `กำลังเตรียมอนุมัติวงเงิน USDT (${amountUsdt} USDT) บน BNB Smart Chain Testnet...`,
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();
      const currentContract = contractAddressRef.current;
      const currentUsdt = usdtAddressRef.current;
      const usdtContract = new ethers.Contract(currentUsdt, USDT_ABI, signer);

      let usdtDecimals = 6;
      try {
        usdtDecimals = Number(await usdtContract.decimals());
      } catch {
        usdtDecimals = 6;
      }

      const approveAmount = ethers.parseUnits(String(amountUsdt), usdtDecimals);
      setTxState((prev) => ({
        ...prev,
        step: `กรุณากดยืนยัน (Approve ${amountUsdt} USDT) ในกระเป๋า MetaMask...`,
      }));

      const approveTx = await usdtContract.approve(currentContract, approveAmount);
      setTxState((prev) => ({
        ...prev,
        step: 'ส่งคำสั่ง Approve USDT แล้ว กำลังรอการยืนยันบน BNB Testnet...',
        txHash: approveTx.hash,
      }));

      const receipt = await approveTx.wait();
      await refreshUserData(userAddr);

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: receipt.hash,
        error: null,
        successMessage: `✅ อนุมัติวงเงิน USDT (${amountUsdt} USDT) สำเร็จแล้ว! คุณสามารถกดปุ่มสมัครสมาชิก (Register) ได้เลย`,
      });
      return receipt;
    } catch (err: any) {
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'การอนุมัติ USDT ล้มเหลว';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: errorMsg,
        successMessage: null,
      });
    }
  };

  // --- FIFO Placement Queue (BullMQ + Redis / In-Memory Lock) Helpers ---
  const requestQueuePlacementReservation = async (params: {
    owner: string;
    sponsorNodeId?: number;
    sponsorAddress?: string;
    count?: number;
    rank?: number;
    mode?: PlacementMode;
    applicants?: Array<{ owner: string }>;
  }) => {
    const res = await fetch('/api/queue/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'ไม่สามารถขอตั๋วคิวจัดสรรตำแหน่งได้');
    }
    return data.reservation;
  };

  const confirmQueueTicket = async (ticketId: string, txHash?: string) => {
    try {
      await fetch('/api/queue/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, txHash }),
      });
    } catch (e) {
      console.warn('Queue ticket confirmation error:', e);
    }
  };

  const releaseQueueTicket = async (ticketId: string) => {
    try {
      await fetch('/api/queue/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      });
    } catch (e) {
      console.warn('Queue ticket release error:', e);
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const res = await fetch('/api/queue/status');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Could not fetch queue status:', e);
    }
    return null;
  };

  // 1. Single Register with Automatic Placement Finder & FIFO Queue Lock (5 USDT - Rank 1)
  const handleRegister = async (
    sponsorNodeId: number,
    autoOptions?: {
      targetParentId?: number | string;
      isLeft?: boolean;
      mode?: PlacementMode;
    }
  ) => {
    setTxState({
      isLoading: true,
      step: `กำลังขอตั๋วคิว FIFO (BullMQ + Redis) เพื่อป้องกัน Race Condition แย่งตำแหน่ง...`,
      txHash: null,
      error: null,
      successMessage: null,
    });

    let activeTicket: any = null;

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();
      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;
      const currentUsdt = usdtAddressRef.current || USDT_ADDRESS;

      const matrixContract = new ethers.Contract(currentContract, MATRIX_ABI, signer);
      const usdtContract = new ethers.Contract(currentUsdt, USDT_ABI, signer);

      let usdtDecimals = 6;
      try {
        usdtDecimals = Number(await usdtContract.decimals());
      } catch {
        usdtDecimals = 6;
      }

      // 1. Check valid sponsor ID on contract (1 wallet can register unlimited times)
      const [isValid, reason, sponsorAddress] = await matrixContract.checkValidSponsorId(sponsorNodeId);
      if (!isValid) {
        throw new Error(`Sponsor Node ID #${sponsorNodeId} ไม่ถูกต้อง: ${reason}`);
      }

      // 2. Get Rank 1 price (5 USDT = 5,000,000 units with 6 decimals)
      let price: bigint;
      try {
        price = await matrixContract.rankPrice(1);
      } catch {
        price = ethers.parseUnits('5', usdtDecimals);
      }

      // 3. Verify USDT Balance
      try {
        const currentUsdtBal: bigint = await usdtContract.balanceOf(userAddr);
        if (currentUsdtBal < price) {
          const formattedHave = Number(ethers.formatUnits(currentUsdtBal, usdtDecimals)).toFixed(2);
          const formattedNeed = Number(ethers.formatUnits(price, usdtDecimals)).toFixed(2);
          throw new Error(
            `ยอดเหรียญ USDT ในกระเป๋าไม่เพียงพอ! คุณมี ${formattedHave} USDT แต่ต้องใช้ ${formattedNeed} USDT (Token: ${currentUsdt})`
          );
        }
      } catch (balErr: any) {
        if (balErr?.message?.includes('ไม่เพียงพอ')) throw balErr;
      }

      // 4. Auto-Find exact next available Binary Slot with FIFO Queue Lock (BullMQ + Redis)
      let autoParentId = autoOptions?.targetParentId ? Number(autoOptions.targetParentId) : 0;
      let autoIsLeft = autoOptions?.isLeft ?? true;
      const modeToUse: PlacementMode = autoOptions?.mode || 'contract_round';

      try {
        setTxState((prev) => ({
          ...prev,
          step: 'กำลังส่งคำขอเข้าคิว FIFO Worker (ป้องกัน Race Condition การแย่งตำแหน่ง)...',
        }));

        activeTicket = await requestQueuePlacementReservation({
          owner: userAddr,
          sponsorNodeId,
          sponsorAddress,
          count: 1,
          rank: 1,
          mode: modeToUse,
        });

        if (activeTicket) {
          autoParentId = Number(activeTicket.targetParentId);
          autoIsLeft = Boolean(activeTicket.isLeft);
          const sideName = autoIsLeft ? 'ซ้าย' : 'ขวา';
          setTxState((prev) => ({
            ...prev,
            step: `จองตำแหน่งสำเร็จ! ตั๋วคิว: ${activeTicket.ticketId} (ล็อค Parent #${autoParentId} ฝั่ง${sideName} ไว้ 90 วินาที)...`,
          }));
        }
      } catch (queueErr) {
        console.warn('FIFO Queue reservation notice:', queueErr);
        // Fallback to client simulation if queue request fails
        if (!autoParentId) {
          const sim = await previewOffChainSimulation(
            signer,
            currentContract,
            sponsorNodeId,
            [{ owner: userAddr }],
            undefined,
            modeToUse
          );
          if (sim.targetParentIds.length > 0) {
            autoParentId = Number(sim.targetParentIds[0]);
            autoIsLeft = Boolean(sim.isLefts[0]);
          }
        }
      }

      setTxState((prev) => ({
        ...prev,
        step: 'กำลังตรวจสอบการอนุมัติเหรียญ (USDT Allowance 5 USDT)...',
      }));

      let currentAllowance: bigint = BigInt(0);
      try {
        currentAllowance = await usdtContract.allowance(userAddr, currentContract);
      } catch (err) {
        console.warn('Could not read allowance directly:', err);
      }

      if (currentAllowance < price) {
        setTxState((prev) => ({
          ...prev,
          step: 'ขั้นตอนที่ 1/2: กรุณากดยืนยัน (Approve) การใช้เหรียญ USDT ในกระเป๋า MetaMask...',
        }));

        const approveTx = await usdtContract.approve(currentContract, price * BigInt(20));
        setTxState((prev) => ({
          ...prev,
          step: 'กำลังรอการบันทึก Approve USDT ลงบล็อกเชน...',
          txHash: approveTx.hash,
        }));
        await approveTx.wait();
      }

      // เงื่อนไขสมัครสมาชิก: จะต้องไปต่อติดตัวของผู้แนะนำตรง Direct Sponsor ซ้ายก่อนขวา
      // แต่ถ้าผู้แนะนำตรง Direct Sponsor ไม่มีช่องว่าง ก็ให้ไปวางต่อติดตัวโคลนนิ่ง Direct Sponsor เท่านั้น
      if (!autoParentId || autoParentId === 0) {
        try {
          const sim = await previewOffChainSimulation(
            signer,
            currentContract,
            sponsorNodeId,
            [{ owner: userAddr }],
            undefined,
            modeToUse
          );
          if (sim.targetParentIds.length > 0) {
            autoParentId = Number(sim.targetParentIds[0]);
            autoIsLeft = Boolean(sim.isLefts[0]);
          }
        } catch (simErr) {
          console.warn('Simulation notice:', simErr);
        }
      }

      const sideLabel = autoIsLeft ? 'LEFT ลูกซ้าย' : 'RIGHT ลูกขวา';

      setTxState((prev) => ({
        ...prev,
        step:
          autoParentId > 0
            ? `ขั้นตอนที่ 2/2: ส่งลงตำแหน่ง (ต่อติดตัวผู้แนะนำตรง/โคลนนิ่ง) Parent #${autoParentId} (${sideLabel})... กรุณายืนยันใน MetaMask`
            : `ขั้นตอนที่ 2/2: ส่งคำสั่งสมัครใต้ผู้แนะนำ #${sponsorNodeId} ค่าสมัคร 5 USDT... กรุณายืนยันใน MetaMask`,
      }));

      let regTx;
      if (autoParentId > 0) {
        try {
          regTx = await matrixContract.registerBatch(
            BigInt(sponsorNodeId),
            1n,
            [BigInt(autoParentId)],
            [Boolean(autoIsLeft)],
            [false]
          );
        } catch {
          regTx = await matrixContract.register(BigInt(sponsorNodeId));
        }
      } else {
        regTx = await matrixContract.register(BigInt(sponsorNodeId));
      }

      setTxState((prev) => ({
        ...prev,
        step: 'ส่ง Transaction แล้ว กำลังรอการยืนยันบน BNB Smart Chain Testnet...',
        txHash: regTx.hash,
      }));

      const receipt = await regTx.wait();

      // Confirm ticket reservation in Queue
      if (activeTicket?.ticketId) {
        await confirmQueueTicket(activeTicket.ticketId, receipt.hash);
      }

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: receipt.hash,
        error: null,
        successMessage:
          autoParentId > 0
            ? `🎉 สมัครสมาชิกสำเร็จ! ลงตำแหน่งออโต้ที่ Parent #${autoParentId} (${sideLabel}) ภายใต้ผู้แนะนำ #${sponsorNodeId} (จองผ่าน FIFO Queue)`
            : `🎉 สมัครสมาชิก FractalFlowMatrix27 (Rank 1 - 5 USDT) สำเร็จเรียบร้อย! (Sponsor Node ID: #${sponsorNodeId})`,
      });

      await refreshUserData(userAddr);

      // อัปเดตผังต้นไม้ไบนารี่ทันทีเมื่อสมัครสำเร็จ
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matrix:tree:refresh'));
      }
      return receipt;
    } catch (err: any) {
      console.error('Register transaction error:', err);
      if (activeTicket?.ticketId) {
        await releaseQueueTicket(activeTicket.ticketId);
      }
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'การสมัครสมาชิกล้มเหลว';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: errorMsg,
        successMessage: null,
      });
    }
  };

  // 2. Batch Register: registerBatch(uint256 _sponsorNodeId, uint256 _count, uint256[] _targetParentIds, bool[] _isLefts, bool[] _isClones)
  const handleRegisterBatch = async (
    sponsorNodeId: number,
    count: number,
    targetParentIds: (string | number)[],
    isLefts: boolean[],
    isClones: boolean[]
  ) => {
    setTxState({
      isLoading: true,
      step: `กำลังเตรียมข้อมูล registerBatch จำนวน ${count} โหนด...`,
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();
      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;
      const currentUsdt = usdtAddressRef.current || USDT_ADDRESS;

      const matrixContract = new ethers.Contract(currentContract, MATRIX_ABI, signer);
      const usdtContract = new ethers.Contract(currentUsdt, USDT_ABI, signer);

      let usdtDecimals = 6;
      try {
        usdtDecimals = Number(await usdtContract.decimals());
      } catch {
        usdtDecimals = 6;
      }

      let unitPrice: bigint;
      try {
        unitPrice = await matrixContract.rankPrice(1);
      } catch {
        unitPrice = ethers.parseUnits('5', usdtDecimals);
      }

      const totalCost = unitPrice * BigInt(count);

      setTxState((prev) => ({
        ...prev,
        step: `ตรวจสอบสิทธิ์ USDT Allowance สำหรับ ${count} โหนด (รวม ${count * 5} USDT)...`,
      }));

      const currentAllowance = await usdtContract.allowance(userAddr, currentContract);
      if (currentAllowance < totalCost) {
        setTxState((prev) => ({
          ...prev,
          step: 'กรุณายืนยัน Approve USDT สำหรับการสมัครแบบกลุ่ม (Batch) ใน MetaMask...',
        }));
        const approveTx = await usdtContract.approve(currentContract, totalCost * BigInt(5));
        setTxState((prev) => ({
          ...prev,
          step: 'กำลังรอการยืนยัน Approve USDT บนบล็อกเชน...',
          txHash: approveTx.hash,
        }));
        await approveTx.wait();
      }

      const formattedParentIds = targetParentIds.map((id) => BigInt(id));

      setTxState((prev) => ({
        ...prev,
        step: `กำลังส่งคำสั่ง registerBatch(${sponsorNodeId}, ${count}, [...]) เข้า Smart Contract...`,
      }));

      const batchTx = await matrixContract.registerBatch(
        BigInt(sponsorNodeId),
        BigInt(count),
        formattedParentIds,
        isLefts,
        isClones
      );

      setTxState((prev) => ({
        ...prev,
        step: 'ส่ง Batch Transaction แล้ว รอการยืนยันบน BNB Testnet...',
        txHash: batchTx.hash,
      }));

      const receipt = await batchTx.wait();

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: receipt.hash,
        error: null,
        successMessage: `🎉 สมัครแบบกลุ่ม (Batch Registration ${count} โหนด = ${count * 5} USDT) สำเร็จเรียบร้อย!`,
      });

      await refreshUserData(userAddr);

      // อัปเดตผังต้นไม้ไบนารี่ทันทีเมื่อสมัครสำเร็จ
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matrix:tree:refresh'));
      }
      return receipt;
    } catch (err: any) {
      console.error('Batch Register error:', err);
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'การทำรายการ registerBatch ล้มเหลว';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: errorMsg,
        successMessage: null,
      });
    }
  };

  // 3. Upgrade Rank: upgradeRank(uint8 _targetRank) - Step-by-step (currentRank + 1) & Vault Deduction
  const handleUpgradeRank = async (targetRank: number) => {
    setTxState({
      isLoading: true,
      step: `กำลังตรวจสอบยอดสะสมใน Vault (getAccumulatedVault) สำหรับแรงค์ ${targetRank}...`,
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();
      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;
      const currentUsdt = usdtAddressRef.current || USDT_ADDRESS;

      const matrixContract = new ethers.Contract(currentContract, MATRIX_ABI, signer);
      const usdtContract = new ethers.Contract(currentUsdt, USDT_ABI, signer);

      let usdtDecimals = 6;
      try {
        usdtDecimals = Number(await usdtContract.decimals());
      } catch {
        usdtDecimals = 6;
      }

      const nominalPrice = RANK_PRICES_USDT[targetRank - 1] || 10;
      let targetPrice: bigint;
      try {
        targetPrice = await matrixContract.rankPrice(targetRank);
      } catch {
        targetPrice = ethers.parseUnits(nominalPrice.toString(), usdtDecimals);
      }

      let savedInVault: bigint = BigInt(0);
      try {
        savedInVault = await matrixContract.getAccumulatedVault(userAddr, targetRank);
      } catch {
        savedInVault = BigInt(0);
      }

      const amountToPay = targetPrice > savedInVault ? targetPrice - savedInVault : BigInt(0);

      if (amountToPay > BigInt(0)) {
        setTxState((prev) => ({
          ...prev,
          step: 'ตรวจสอบการอนุมัติเหรียญ USDT ส่วนต่างหลังหักลบยอดสะสมใน Vault...',
        }));

        const currentAllowance = await usdtContract.allowance(userAddr, currentContract);
        if (currentAllowance < amountToPay) {
          setTxState((prev) => ({
            ...prev,
            step: 'กรุณายืนยันสิทธิ์การใช้งาน USDT (Approve) ใน MetaMask...',
          }));
          const approveTx = await usdtContract.approve(currentContract, targetPrice * BigInt(5));
          setTxState((prev) => ({
            ...prev,
            step: 'กำลังรอการยืนยัน Approve บนบล็อกเชน...',
            txHash: approveTx.hash,
          }));
          await approveTx.wait();
        }
      }

      setTxState((prev) => ({
        ...prev,
        step: `กำลังส่งคำสั่ง upgradeRank(${targetRank})... กรุณายืนยันใน MetaMask`,
      }));

      const upgradeTx = await matrixContract.upgradeRank(targetRank);
      setTxState((prev) => ({
        ...prev,
        step: 'ส่ง Transaction แล้ว รอการประมวลผลบนบล็อกเชน...',
        txHash: upgradeTx.hash,
      }));

      const receipt = await upgradeTx.wait();

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: receipt.hash,
        error: null,
        successMessage: `🚀 อัปเกรดสู่แรงค์ ${targetRank} (${nominalPrice} USDT) สำเร็จเรียบร้อย!`,
      });

      await refreshUserData(userAddr);
      return receipt;
    } catch (err: any) {
      console.error('Upgrade transaction error:', err);
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'การอัปเกรดแรงค์ล้มเหลว';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: errorMsg,
        successMessage: null,
      });
    }
  };

  // 4A. Process Auto New Main ID (Vault 1-4) - Separated Function
  const handleProcessAutoNewMainId = async () => {
    const v1To4 = Array.isArray(profile?.vaults)
      ? profile.vaults
          .filter((v: any) => v.rank >= 1 && v.rank <= 4)
          .reduce((acc: number, curr: any) => acc + parseFloat(curr.balance || '0'), 0)
      : 0;

    if (v1To4 < 5.0) {
      const remaining = (5.0 - v1To4).toFixed(2);
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: `ยอดสะสม Vault 1-4 ปัจจุบันมี ${v1To4.toFixed(2)} USDT (ยังไม่ถึง 5.00 USDT ขาดอีก ${remaining} USDT) — ระบบจะออก Auto New Main ID ทันทีเมื่อสะสมครบ 5.00 USDT`,
        successMessage: null,
      });
      return;
    }

    setTxState({
      isLoading: true,
      step: 'กำลังส่งคำสั่ง checkAndProcessAutoNewMainId (แปลงยอดสะสม Vault 1-4 เป็น New Main ID โดยไม่ใช้เหรียญในกระเป๋า)...',
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();
      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;
      const matrixContract = new ethers.Contract(currentContract, MATRIX_ABI, signer);
      const totalBefore = Number(await matrixContract.totalNodesInRank(1).catch(() => 0n));

      const tx = await matrixContract.checkAndProcessAutoNewMainId(userAddr);
      setTxState((prev) => ({
        ...prev,
        step: 'กำลังรอการยืนยันบนบล็อกเชน...',
        txHash: tx.hash,
      }));

      const receipt = await tx.wait();
      const totalAfter = Number(await matrixContract.totalNodesInRank(1).catch(() => BigInt(totalBefore)));
      const createdNodesCount = Math.max(0, totalAfter - totalBefore);

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: receipt.hash,
        error: null,
        successMessage: createdNodesCount > 0
          ? `✨ สร้าง Auto New Main ID จากยอดสะสม Vault 1-4 สำเร็จ (+${createdNodesCount} รหัสหลักใหม่)!`
          : `✨ ตรวจสอบและประมวลผลคำสั่ง Auto New Main ID บนบล็อกเชนเรียบร้อยแล้ว`,
      });

      await refreshUserData(userAddr);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matrix:tree:refresh'));
      }
      return receipt;
    } catch (err: any) {
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'ไม่สามารถประมวลผล Auto New Main ID ได้';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: errorMsg,
        successMessage: null,
      });
    }
  };

  // 4B. Process Auto Extra ID (Vault 4-27) - Separated Function
  const handleProcessAutoExtraId = async (currentRank = 2) => {
    if (currentRank < 2 || currentRank > 27) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: 'Auto Extra ID รองรับเฉพาะ Rank 2 ถึง Rank 27',
        successMessage: null,
      });
      return;
    }

    const targetPrice = RANK_PRICES_USDT[currentRank - 1] || 10;
    const v4To27 = Array.isArray(profile?.vaults)
      ? profile.vaults
          .filter((v: any) => v.rank >= 4 && v.rank <= 27)
          .reduce((acc: number, curr: any) => acc + parseFloat(curr.balance || '0'), 0)
      : 0;

    if (v4To27 < targetPrice) {
      const remaining = (targetPrice - v4To27).toFixed(2);
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: `ยอดสะสม Vault 4-27 สำหรับสร้าง Auto Extra ID ใน Rank ${currentRank} ปัจจุบันมี ${v4To27.toFixed(2)} USDT (ต้องการ ${targetPrice}.00 USDT ขาดอีก ${remaining} USDT)`,
        successMessage: null,
      });
      return;
    }

    setTxState({
      isLoading: true,
      step: `กำลังส่งคำสั่ง checkAndProcessAutoExtraId สำหรับแรงค์ ${currentRank}...`,
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();
      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;
      const matrixContract = new ethers.Contract(currentContract, MATRIX_ABI, signer);
      const totalBefore = Number(await matrixContract.totalNodesInRank(currentRank).catch(() => 0n));

      const tx = await matrixContract.checkAndProcessAutoExtraId(userAddr, currentRank);
      setTxState((prev) => ({
        ...prev,
        step: 'กำลังรอการยืนยันบนบล็อกเชน...',
        txHash: tx.hash,
      }));

      const receipt = await tx.wait();
      const totalAfter = Number(await matrixContract.totalNodesInRank(currentRank).catch(() => BigInt(totalBefore)));
      const createdNodesCount = Math.max(0, totalAfter - totalBefore);

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: receipt.hash,
        error: null,
        successMessage: createdNodesCount > 0
          ? `✨ สร้าง Auto Extra ID สำหรับ Rank ${currentRank} สำเร็จ (+${createdNodesCount} โหนด Extra ID ใหม่)!`
          : `⚠️ บล็อกเชนบันทึกคำสั่งแล้ว แต่ยังไม่พบโหนด Extra ID ใหม่ใน Rank ${currentRank} เนื่องจากยอดสะสม Vault อาจติดส่วนสำรองอัปเกรด`,
      });

      await refreshUserData(userAddr);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matrix:tree:refresh'));
      }
      return receipt;
    } catch (err: any) {
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'ไม่สามารถประมวลผล Auto Extra ID ได้';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: errorMsg,
        successMessage: null,
      });
    }
  };


  const handleExecuteOffChainSimulationAndBatch = async (
    sponsorNodeId: number,
    applicantsQueue: ApplicantItem[],
    onStatusCallback?: (msg: string) => void,
    mode: PlacementMode = 'contract_round'
  ) => {
    setTxState({
      isLoading: true,
      step: 'กำลังคำนวณหาตำแหน่งที่จะลงออโต้สำหรับทุกโหนด (Auto-Placement Batch)...',
      txHash: null,
      error: null,
      successMessage: null,
    });

    let activeBatchTicket: any = null;

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();

      try {
        setTxState((prev) => ({
          ...prev,
          step: `กำลังขอตั๋วคิว FIFO สำหรับชุดโหนด ${applicantsQueue.length} รหัส (ป้องกันการแย่งตำแหน่ง)...`,
        }));
        activeBatchTicket = await requestQueuePlacementReservation({
          owner: userAddr,
          sponsorNodeId,
          count: applicantsQueue.length,
          rank: 1,
          mode,
          applicants: applicantsQueue,
        });
      } catch (qErr) {
        console.warn('Queue batch reservation notice:', qErr);
      }

      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;
      const result = await executeOffChainSimulationAndBatch(
        signer,
        currentContract,
        sponsorNodeId,
        applicantsQueue,
        (msg: string) => {
          setTxState((prev) => ({ ...prev, step: msg }));
          if (onStatusCallback) onStatusCallback(msg);
        },
        mode
      );

      if (result.success) {
        if (activeBatchTicket?.ticketId) {
          await confirmQueueTicket(activeBatchTicket.ticketId, result.txHash);
        }
        setTxState({
          isLoading: false,
          step: 'สำเร็จ!',
          txHash: result.txHash || null,
          error: null,
          successMessage: `🎉 สมัครแบบกลุ่ม (${applicantsQueue.length} โหนด) ลงตำแหน่งออโต้สำเร็จ! Tx: ${result.txHash} (ผ่านระบบ FIFO Queue)`,
        });
        await refreshUserData(userAddr);

        // อัปเดตผังต้นไม้ไบนารี่ทันทีเมื่อสมัครแบบกลุ่มสำเร็จ
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('matrix:tree:refresh'));
        }
      } else {
        if (activeBatchTicket?.ticketId) {
          await releaseQueueTicket(activeBatchTicket.ticketId);
        }
        setTxState({
          isLoading: false,
          step: '',
          txHash: null,
          error: result.error || 'เกิดข้อผิดพลาดในการทำรายการ',
          successMessage: null,
        });
      }

      return result;
    } catch (err: any) {
      if (activeBatchTicket?.ticketId) {
        await releaseQueueTicket(activeBatchTicket.ticketId);
      }
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'เกิดข้อผิดพลาด';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: errorMsg,
        successMessage: null,
      });
      return { success: false, error: errorMsg };
    }
  };

  const inspectRankData = useCallback(
    async (rank: number) => {
      const rankNum = Math.min(Math.max(Number(rank) || 1, 1), 27);
      const nextPriceNum = rankNum < 27 ? RANK_PRICES_USDT[rankNum] : 0;
      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;

      try {
        const matrixContract = new ethers.Contract(currentContract, MATRIX_ABI, readOnlyBscProvider);
        let targetAddr = account;
        if (!targetAddr) {
          const node1 = await matrixContract.rankNodes(rankNum, 1);
          targetAddr = String(node1.owner ?? node1[1] ?? '');
        }
        if (targetAddr && targetAddr !== ethers.ZeroAddress) {
          const rankInfo = await matrixContract.getUserRankInfo(targetAddr, rankNum);
          let formattedVault = '0.00';
          let formattedNextPrice = nextPriceNum > 0 ? `${nextPriceNum.toFixed(2)} USDT` : 'Max Rank';

          try {
            let effectiveVaultBn: bigint = BigInt(rankInfo[2] ?? 0);
            const firstId = Number(rankInfo[0] ?? 0);
            if (firstId > 0) {
              try {
                const nodeVaultBn: bigint = await matrixContract.nodeUpgradeVault(rankNum, firstId);
                if (nodeVaultBn < effectiveVaultBn) {
                  effectiveVaultBn = nodeVaultBn;
                }
              } catch {
                // Fallback
              }
            }
            formattedVault = Number(ethers.formatUnits(effectiveVaultBn, 6)).toFixed(2);
            if (rankInfo[3] > 0n) {
              formattedNextPrice = `${Number(ethers.formatUnits(rankInfo[3], 6)).toFixed(2)} USDT`;
            } else {
              formattedNextPrice = 'Max Rank';
            }
          } catch {
            formattedVault = '0.00';
          }

          return {
            firstNodeId: rankInfo[0].toString(),
            latestNodeId: rankInfo[1].toString(),
            upgradeVaultBalance: formattedVault,
            nextRankPrice: formattedNextPrice,
          };
        }
      } catch {
        // Fallback to profile vaults
      }

      const matchingVault = profile?.vaults?.find((v) => v.rank === rankNum);
      return {
        firstNodeId: matchingVault?.firstNodeId || (rankNum === 1 ? profile?.mainNodeIdRank1 || '1' : '0'),
        latestNodeId: matchingVault?.latestNodeId || (rankNum === 1 ? profile?.latestCloneIdRank1 || '0' : '0'),
        upgradeVaultBalance: matchingVault?.balance || '0.00',
        nextRankPrice: nextPriceNum > 0 ? `${nextPriceNum.toFixed(2)} USDT` : 'Max Rank',
      };
    },
    [account, profile]
  );

  const handleAdminUpgrade = async (targetUser: string, targetRank: number) => {
    if (!ethers.isAddress(targetUser)) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: 'Target User Address ไม่ถูกต้อง (Invalid Address)',
        successMessage: null,
      });
      return;
    }

    setTxState({
      isLoading: true,
      step: `กำลังส่งคำสั่ง Admin Upgrade Rank ${targetRank} ให้ ${targetUser.substring(0, 8)}...`,
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const { signer, userAddr } = await ensureWalletAndBscTestnet();
      const currentContract = contractAddressRef.current || CONTRACT_ADDRESS;
      const matrixContract = new ethers.Contract(currentContract, MATRIX_ABI, signer);

      const tx = await matrixContract.adminUpgradeRank(targetUser, targetRank);
      setTxState((prev) => ({
        ...prev,
        step: 'กำลังรอการยืนยันธุรกรรม Admin Upgrade บนบล็อกเชน...',
        txHash: tx.hash,
      }));
      const receipt = await tx.wait();

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: receipt.hash,
        error: null,
        successMessage: `✅ Admin Upgrade สำเร็จ! อัปเกรด ${targetUser.substring(0, 8)}... เป็น Rank ${targetRank}`,
      });

      await refreshUserData(userAddr);
      return receipt;
    } catch (err: any) {
      const errorMsg = err?.reason || err?.shortMessage || err?.message || 'Admin action failed';
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: `Admin action failed: ${errorMsg}`,
        successMessage: null,
      });
    }
  };

  const updateSmartContractAddress = async (newContract: string, newUsdt?: string) => {
    if (!newContract || !ethers.isAddress(newContract)) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: 'รูปแบบที่อยู่ Smart Contract ไม่ถูกต้อง (Invalid Ethereum/BSC Address 0x...)',
        successMessage: null,
      });
      return false;
    }

    if (newUsdt && !ethers.isAddress(newUsdt)) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: 'รูปแบบที่อยู่ USDT Token ไม่ถูกต้อง (Invalid Address 0x...)',
        successMessage: null,
      });
      return false;
    }

    setTxState({
      isLoading: true,
      step: `กำลังบันทึกที่อยู่ Smart Contract (${newContract.substring(0, 10)}...) ลง Database...`,
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const res = await fetch('/api/config/contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractAddress: newContract.trim(),
          usdtAddress: newUsdt ? newUsdt.trim() : usdtAddressRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'บันทึกลง Database ล้มเหลว');
      }

      setContractAddress(newContract.trim());
      contractAddressRef.current = newContract.trim();
      if (newUsdt) {
        setUsdtAddress(newUsdt.trim());
        usdtAddressRef.current = newUsdt.trim();
      }
      setDynamicContractConfig(newContract.trim(), newUsdt ? newUsdt.trim() : usdtAddressRef.current);

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: null,
        error: null,
        successMessage: `💾 บันทึกที่อยู่ Smart Contract ใหม่ (${newContract.substring(0, 8)}...${newContract.substring(38)}) ลง Database สำเร็จแล้ว! ระบบเริ่มใช้งานสัญญานี้ทันที`,
      });

      if (account) {
        await refreshUserData(account, newContract.trim(), newUsdt ? newUsdt.trim() : usdtAddressRef.current);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matrix:tree:refresh'));
      }
      return true;
    } catch (err: any) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: err.message || 'บันทึกลง Database ไม่สำเร็จ',
        successMessage: null,
      });
      return false;
    }
  };

  const resetSmartContractAddress = async () => {
    setTxState({
      isLoading: true,
      step: 'กำลังคืนค่าที่อยู่ Smart Contract บน Database เป็นค่าเริ่มต้น...',
      txHash: null,
      error: null,
      successMessage: null,
    });

    try {
      const res = await fetch('/api/config/contract/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'คืนค่าไม่สำเร็จ');
      }

      clearDynamicContractConfig();
      setContractAddress(DEFAULT_CONTRACT_ADDRESS);
      contractAddressRef.current = DEFAULT_CONTRACT_ADDRESS;
      setUsdtAddress(DEFAULT_USDT_ADDRESS);
      usdtAddressRef.current = DEFAULT_USDT_ADDRESS;

      setTxState({
        isLoading: false,
        step: 'สำเร็จ!',
        txHash: null,
        error: null,
        successMessage: '🔄 คืนค่า Smart Contract บน Database เป็นค่าเริ่มต้นโรงงานเรียบร้อยแล้ว',
      });

      if (account) {
        await refreshUserData(account, DEFAULT_CONTRACT_ADDRESS, DEFAULT_USDT_ADDRESS);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('matrix:tree:refresh'));
      }
      return true;
    } catch (err: any) {
      setTxState({
        isLoading: false,
        step: '',
        txHash: null,
        error: err.message || 'คืนค่าไม่สำเร็จ',
        successMessage: null,
      });
      return false;
    }
  };

  const clearTxState = () => {
    setTxState({
      isLoading: false,
      step: '',
      txHash: null,
      error: null,
      successMessage: null,
    });
  };

  return {
    contractAddress,
    usdtAddress,
    updateSmartContractAddress,
    resetSmartContractAddress,
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
    txState,
    connectWallet,
    loginWithCustomInput,
    loginWithDemoUnregisteredWallet,
    disconnectWallet,
    switchToBscTestnet,
    refreshUserData: () => account && refreshUserData(account),
    checkSponsorNode,
    previewNextPlacement,
    inspectRankData,
    handleApproveUsdt,
    handleRegister,
    handleRegisterBatch,
    handleExecuteOffChainSimulationAndBatch,
    handleUpgradeRank,
    handleAdminUpgrade,
    handleProcessAutoNewMainId,
    handleProcessAutoExtraId,
    requestQueuePlacementReservation,
    releaseQueueTicket,
    fetchQueueStatus,
    clearTxState,
  };
}
