import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESS,
  BSC_TESTNET_RPC,
  BSC_TESTNET_PARAMS,
  MATRIX_ABI,
  RANK_PRICES_USDT,
} from '../contracts/config';
import {
  RefreshCw,
  Search,
  Copy,
  Check,
  Sparkles,
  RotateCcw,
  User,
  ZoomIn,
  ZoomOut,
  Dna,
  Layers,
  Eye,
  Coins,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
  Shield,
} from 'lucide-react';

export interface EnrichedBinaryNode {
  id: number;
  rank: number;
  level: number;
  parentId: number;
  isLeft: boolean;
  owner: string;
  directSponsor: string;
  leftChild: number;
  rightChild: number;
  isClone: boolean;
  isExtraId: boolean;
  isAutoMainId: boolean;
  // Clone & Lineage Metadata
  originMainId: number; // รหัสหลัก (Primary Main ID of this owner/lineage, e.g. #1, #2, #7)
  spawnedFromNodeId: number; // Exact node whose Right child triggered this clone
  cloneRound: number; // รอบโคลน (รอบ 1, 2, 3...)
  subCloneDepth: number; // #0 if spawned from primary ID, >=1 if spawned from a clone
  spawnedCloneIds: Array<{ cloneNodeId: number; round: number }>; // Clones spawned by this node
  directUplineNodeId: number; // ผู้แนะนำ (Sponsor's primary node ID, #0 for Root)
  // Per-Node Benefits (ผลประโยชน์เฉพาะผังนี้)
  directRewardThisNode: number; // 30% ค่าแนะนำเฉพาะผังนี้
  unilevelRewardThisNode: number; // ยูนิเลเวล 15 ชั้นเฉพาะผังนี้ (2% ต่อชั้น)
  // Cumulative Benefits Across All Nodes of this Owner/ID (ผลประโยชน์สะสมรวมทุกผัง)
  directRewardAllNodes: number; // 30% ค่าแนะนำ (ทุกผัง)
  unilevelRewardAllNodes: number; // ยูนิเลเวล 15 ชั้น (ทุกผัง)
  upgradeRankPool: number; // Upgrade Rank Pool
  newAutoIdPool: number; // New Auto ID Pool (Vault 1-4)
  newExtraIdPool: number; // New Extra ID Pool (Vault 5-27)
  totalClonesCount: number; // จำนวนโคลนนิ่งทั้งหมด
  totalAutoIdCount: number; // จำนวน New Auto ID ทั้งหมด
  totalExtraIdCount: number; // จำนวน New Extra ID ทั้งหมด
  vaultBalance: number;
  nextRankPrice: number;
  familyPoolDirectFromLineage?: number; // 30% จากโคลน #1 ลงซ้ายที่ถูกส่งเข้า Family Pool
  grossVaultFromLineage?: number; // ยอดสะสม Vault รวมก่อนหักออก Auto ID / อัปเกรด
}

interface ConnectorLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isLeft: boolean;
  isFilled: boolean;
}

interface MatrixTreeVisualizerProps {
  language: 'th' | 'en';
  userAddress: string | null;
  chainId?: number | null;
  isBscTestnet?: boolean;
  onConnectWallet?: () => void;
  onSwitchNetwork?: () => void;
  onRegisterWithSponsor?: (
    sponsorNodeId: number,
    autoOptions?: { targetParentId?: number | string; isLeft?: boolean }
  ) => Promise<any>;
  onUpgradeToRank?: (targetRank: number) => Promise<any>;
  lastTxSuccess?: string | null;
  refreshTrigger?: any;
  contractAddress?: string;
}

const RPC_ENDPOINTS = [
  BSC_TESTNET_RPC,
  ...BSC_TESTNET_PARAMS.rpcUrls.filter((u) => u !== BSC_TESTNET_RPC),
];

function shortenWallet(addr?: string): string {
  if (!addr || addr === ethers.ZeroAddress) return '0x0000...';
  return `${addr.slice(0, 6)}...`;
}

// Build preview dataset matching all screenshots (including #1..#10 with #7 (7) and Clone #7 #10 #0 รอบ 1)
function buildScreenshotPreviewNodes(rank: number): Map<number, EnrichedBinaryNode> {
  const unitPrice = RANK_PRICES_USDT[rank - 1] || 5;
  const nextPrice = rank < 27 ? RANK_PRICES_USDT[rank] : unitPrice * 2;
  const scale = unitPrice / 5;

  const rawList: EnrichedBinaryNode[] = [
    {
      id: 1,
      rank,
      level: 1,
      parentId: 0,
      isLeft: true,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: ethers.ZeroAddress,
      leftChild: 2,
      rightChild: 3,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 1,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [{ cloneNodeId: 4, round: 1 }],
      directUplineNodeId: 0,
      directRewardThisNode: 3.0 * scale,
      unilevelRewardThisNode: 0.6 * scale,
      directRewardAllNodes: 6.0 * scale,
      unilevelRewardAllNodes: 0.7 * scale,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 2,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 2,
      rank,
      level: 2,
      parentId: 1,
      isLeft: true,
      owner: '0xd350758257Bee9AdB111944b1737d257620e80CE',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 4,
      rightChild: 5,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 2,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [{ cloneNodeId: 6, round: 1 }],
      directUplineNodeId: 1,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.3 * scale,
      directRewardAllNodes: 1.5 * scale,
      unilevelRewardAllNodes: 0.4 * scale,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 1,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 3,
      rank,
      level: 2,
      parentId: 1,
      isLeft: false,
      owner: '0xd350758257Bee9AdB111944b1737d257620e80CE',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 10,
      rightChild: 13,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 3,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 1,
      directRewardThisNode: 1.5 * scale,
      unilevelRewardThisNode: 0.2 * scale,
      directRewardAllNodes: 1.5 * scale,
      unilevelRewardAllNodes: 0.2 * scale,
      upgradeRankPool: 1.75 * scale,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 0,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 1.75 * scale,
      nextRankPrice: nextPrice,
    },
    {
      id: 4,
      rank,
      level: 3,
      parentId: 2,
      isLeft: true,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 6,
      rightChild: 0,
      isClone: true,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 1,
      spawnedFromNodeId: 1,
      cloneRound: 1,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 0,
      directRewardThisNode: 1.5 * scale,
      unilevelRewardThisNode: 0.1 * scale,
      directRewardAllNodes: 6.0 * scale,
      unilevelRewardAllNodes: 0.7 * scale,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 2,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 5,
      rank,
      level: 3,
      parentId: 2,
      isLeft: false,
      owner: '0xd350758257Bee9AdB111944b1737d257620e80CE',
      directSponsor: '0xd350758257Bee9AdB111944b1737d257620e80CE',
      leftChild: 0,
      rightChild: 0,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 5,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 2,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 0.0,
      unilevelRewardAllNodes: 0.0,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 0,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 6,
      rank,
      level: 4,
      parentId: 4,
      isLeft: true,
      owner: '0xd350758257Bee9AdB111944b1737d257620e80CE',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 0,
      rightChild: 0,
      isClone: true,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 2,
      spawnedFromNodeId: 2,
      cloneRound: 1,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 1,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 1.5 * scale,
      unilevelRewardAllNodes: 0.4 * scale,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 1,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 7,
      rank,
      level: 3,
      parentId: 3,
      isLeft: true,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0xd350758257Bee9AdB111944b1737d257620e80CE',
      leftChild: 8,
      rightChild: 9,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 7,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [{ cloneNodeId: 10, round: 1 }],
      directUplineNodeId: 3,
      directRewardThisNode: 1.5 * scale,
      unilevelRewardThisNode: 0.1 * scale,
      directRewardAllNodes: 1.5 * scale,
      unilevelRewardAllNodes: 0.1 * scale,
      upgradeRankPool: 1.75 * scale,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 1,
      totalAutoIdCount: 1,
      totalExtraIdCount: 0,
      vaultBalance: 1.75 * scale,
      nextRankPrice: nextPrice,
    },
    {
      id: 8,
      rank,
      level: 4,
      parentId: 7,
      isLeft: true,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 0,
      rightChild: 0,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 8,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 7,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 0.0,
      unilevelRewardAllNodes: 0.0,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 0,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 9,
      rank,
      level: 4,
      parentId: 7,
      isLeft: false,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 0,
      rightChild: 0,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 9,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 7,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 0.0,
      unilevelRewardAllNodes: 0.0,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 0,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 10,
      rank,
      level: 3,
      parentId: 3,
      isLeft: true,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0xd350758257Bee9AdB111944b1737d257620e80CE',
      leftChild: 11,
      rightChild: 12,
      isClone: true,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 1,
      spawnedFromNodeId: 7,
      cloneRound: 1,
      subCloneDepth: 2,
      spawnedCloneIds: [],
      directUplineNodeId: 3,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 1.5 * scale,
      unilevelRewardAllNodes: 0.1 * scale,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 1,
      totalAutoIdCount: 1,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 11,
      rank,
      level: 4,
      parentId: 10,
      isLeft: true,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 0,
      rightChild: 0,
      isClone: false,
      isExtraId: false,
      isAutoMainId: true,
      originMainId: 11,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 10,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 0.0,
      unilevelRewardAllNodes: 0.0,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 0,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 12,
      rank,
      level: 4,
      parentId: 10,
      isLeft: false,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 0,
      rightChild: 0,
      isClone: false,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 12,
      spawnedFromNodeId: 0,
      cloneRound: 0,
      subCloneDepth: 0,
      spawnedCloneIds: [],
      directUplineNodeId: 10,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 0.0,
      unilevelRewardAllNodes: 0.0,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 0,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
    {
      id: 13,
      rank,
      level: 3,
      parentId: 3,
      isLeft: false,
      owner: '0x5b0791A0bc71900238de668C848D700D',
      directSponsor: '0x5b0791A0bc71900238de668C848D700D',
      leftChild: 0,
      rightChild: 0,
      isClone: true,
      isExtraId: false,
      isAutoMainId: false,
      originMainId: 1,
      spawnedFromNodeId: 10,
      cloneRound: 2,
      subCloneDepth: 3,
      spawnedCloneIds: [],
      directUplineNodeId: 3,
      directRewardThisNode: 0.0,
      unilevelRewardThisNode: 0.0,
      directRewardAllNodes: 0.0,
      unilevelRewardAllNodes: 0.0,
      upgradeRankPool: 0.0,
      newAutoIdPool: 0.0,
      newExtraIdPool: 0.0,
      totalClonesCount: 0,
      totalAutoIdCount: 0,
      totalExtraIdCount: 0,
      vaultBalance: 0.0,
      nextRankPrice: nextPrice,
    },
  ];

  const map = new Map<number, EnrichedBinaryNode>();
  for (const item of rawList) {
    map.set(item.id, item);
  }
  return map;
}

export const MatrixTreeVisualizer: React.FC<MatrixTreeVisualizerProps> = ({
  language,
  userAddress,
  isBscTestnet = false,
  onRegisterWithSponsor,
  lastTxSuccess,
  refreshTrigger,
  contractAddress,
}) => {
  const [selectedRank, setSelectedRank] = useState<number>(1);
  const [focusRootId, setFocusRootId] = useState<number>(1);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([1]);
  const [searchInput, setSearchInput] = useState<string>('1');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'onchain' | 'demoCloneTree'>('onchain');
  const [justUpdatedBadge, setJustUpdatedBadge] = useState<boolean>(false);
  const [maxRenderDepth, setMaxRenderDepth] = useState<number>(8);

  // Track which Node ID currently has its "รายละเอียดผลประโยชน์" (Benefit Details) popover open
  const [expandedBenefitNodeId, setExpandedBenefitNodeId] = useState<number | null>(null);

  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);
  const [totalNodesInRank, setTotalNodesInRank] = useState<number>(1);
  const [onChainNodesMap, setOnChainNodesMap] = useState<Map<number, EnrichedBinaryNode>>(new Map());
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeLocks, setActiveLocks] = useState<
    Array<{ parentId: string; isLeft: boolean; owner: string }>
  >([]);

  useEffect(() => {
    const fetchLocks = async () => {
      try {
        const res = await fetch('/api/queue/status');
        if (res.ok) {
          const data = await res.json();
          if (data.activeReservations && Array.isArray(data.activeReservations)) {
            const now = Date.now();
            const locks: Array<{ parentId: string; isLeft: boolean; owner: string }> = [];
            for (const r of data.activeReservations) {
              if (r.status === 'RESERVED' && now <= r.expiresAt && r.rank === selectedRank) {
                for (const b of r.batchDetails) {
                  locks.push({
                    parentId: String(b.targetParentId),
                    isLeft: Boolean(b.isLeft),
                    owner: b.owner,
                  });
                }
              }
            }
            setActiveLocks(locks);
          }
        }
      } catch {
        // Ignore fetch error
      }
    };

    fetchLocks();
    const interval = setInterval(fetchLocks, 3000);
    return () => clearInterval(interval);
  }, [selectedRank]);

  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const treeContentRef = useRef<HTMLDivElement | null>(null);
  const [connectorLines, setConnectorLines] = useState<ConnectorLine[]>([]);
  const [treeDimensions, setTreeDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const getWorkingProvider = useCallback(async (): Promise<ethers.Provider> => {
    if (typeof window !== 'undefined' && window.ethereum && isBscTestnet) {
      try {
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.getBlockNumber();
        return browserProvider;
      } catch {
        // Fallback to RPC
      }
    }

    for (const rpcUrl of RPC_ENDPOINTS) {
      try {
        const rpcProvider = new ethers.JsonRpcProvider(
          rpcUrl,
          { chainId: 97, name: 'bnbt' },
          { staticNetwork: true }
        );
        await rpcProvider.getBlockNumber();
        return rpcProvider;
      } catch {
        continue;
      }
    }

    return new ethers.JsonRpcProvider(
      BSC_TESTNET_RPC,
      { chainId: 97, name: 'bnbt' },
      { staticNetwork: true }
    );
  }, [isBscTestnet]);

  // Load all nodes in the selected rank from Smart Contract & compute Clone Lineage + Benefit Breakdown
  const loadOnChainTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const provider = await getWorkingProvider();
      const activeContract = contractAddress || CONTRACT_ADDRESS;
      const contract = new ethers.Contract(activeContract, MATRIX_ABI, provider);

      const unitPrice = RANK_PRICES_USDT[selectedRank - 1] || 5;
      const nextPrice = selectedRank < 27 ? RANK_PRICES_USDT[selectedRank] : unitPrice * 2;
      const directBonusUnit = unitPrice * 0.3; // 30%
      const unilevelBonusUnit = unitPrice * 0.02; // 2% per level (15 levels)
      const vaultUnit = unitPrice * 0.35; // 35%

      let totalNodes = 1;
      try {
        const totalBn: bigint = await contract.totalNodesInRank(selectedRank);
        totalNodes = Number(totalBn);
      } catch {
        totalNodes = 1;
      }
      setTotalNodesInRank(totalNodes);

      const maxFetch = Math.min(Math.max(totalNodes, 1), 60);
      const rawNodes = new Map<
        number,
        {
          id: number;
          owner: string;
          directSponsor: string;
          parentId: number;
          leftChild: number;
          rightChild: number;
          isClone: boolean;
          isExtraId: boolean;
        }
      >();

      const idsToFetch = Array.from({ length: maxFetch }, (_, idx) => idx + 1);
      await Promise.all(
        idsToFetch.map(async (nodeId) => {
          try {
            const raw = await contract.rankNodes(selectedRank, nodeId);
            const fetchedId = Number(raw.id ?? raw[0] ?? 0);
            if (fetchedId > 0) {
              rawNodes.set(fetchedId, {
                id: fetchedId,
                owner: String(raw.owner ?? raw[1] ?? ethers.ZeroAddress),
                directSponsor: String(raw.directSponsor ?? raw[2] ?? ethers.ZeroAddress),
                parentId: Number(raw.parentId ?? raw[3] ?? 0),
                leftChild: Number(raw.leftChild ?? raw[4] ?? 0),
                rightChild: Number(raw.rightChild ?? raw[5] ?? 0),
                isClone: Boolean(raw.isClone ?? raw[6] ?? false),
                isExtraId: Boolean(raw.isExtraId ?? raw[7] ?? false),
              });
            }
          } catch {
            // Ignore individual slot read error
          }
        })
      );

      const ownerPrimaryNodeMap = new Map<string, number>();
      const ownerAllMainNodesMap = new Map<string, number[]>();
      const nodeCloneRoundCount = new Map<number, number>();
      const nodeSpawnedClones = new Map<number, Array<{ cloneNodeId: number; round: number }>>();
      const nodeDirectBonusMap = new Map<number, number>();
      const nodeUnilevelBonusMap = new Map<number, number>();
      const autoMainNodeIds = new Set<number>();
      const autoIdSourceMainMap = new Map<number, number>();
      const mainNodeAutoIdSpawnCount = new Map<number, number>();
      const lineageExtraIdSpawnCount = new Map<number, number>();
      const lineageUpgradeVault = new Map<number, number>();
      const lineageAutoIdVault = new Map<number, number>();
      const lineageExtraIdVault = new Map<number, number>();
      const lineageGrossVaultMap = new Map<number, number>();
      const lineageFamilyPoolDirectMap = new Map<number, number>();
      const lineageHasUpgraded = new Map<number, boolean>();

      const sortedIds = Array.from(rawNodes.keys()).sort((a, b) => a - b);
      const rootOwnerKey = (rawNodes.get(1)?.owner || '').toLowerCase();

      // Fetch currentMaxRank for unique owners in the tree so we know whether selectedRank + 1 is already unlocked
      const uniqueOwners = Array.from(
        new Set(
          Array.from(rawNodes.values())
            .map((n) => n.owner)
            .filter((addr) => addr && addr !== ethers.ZeroAddress)
        )
      );
      const ownerMaxRankMap = new Map<string, number>();
      await Promise.all(
        uniqueOwners.map(async (ownerAddr) => {
          try {
            const prof = await contract.getUserProfile(ownerAddr);
            const maxR = Number(prof.currentMaxRank ?? prof[3] ?? 1);
            ownerMaxRankMap.set(ownerAddr.toLowerCase(), maxR > 0 ? maxR : 1);
          } catch {
            ownerMaxRankMap.set(ownerAddr.toLowerCase(), 1);
          }
        })
      );

      // Helper to check if candidateAncestorId is an ancestor of targetId in the binary tree
      const isAncestorOf = (candidateAncestorId: number, targetId: number): boolean => {
        if (candidateAncestorId <= 0 || targetId <= 0) return false;
        let curr = targetId;
        const guard = new Set<number>();
        while (curr > 0 && !guard.has(curr)) {
          if (curr === candidateAncestorId) return true;
          guard.add(curr);
          const p = rawNodes.get(curr);
          curr = p ? p.parentId : 0;
        }
        return false;
      };

      // Pass 1: Build Clone Lineage (originMainId, spawnedFromNodeId, cloneRound, subCloneDepth) first
      const originMainIdMap = new Map<number, number>();
      const spawnedFromMap = new Map<number, number>();
      const cloneRoundMap = new Map<number, number>();
      const subCloneDepthMap = new Map<number, number>();
      const matchedRightTriggers = new Set<number>();

      for (const id of sortedIds) {
        const n = rawNodes.get(id)!;
        const ownerKey = n.owner.toLowerCase();
        nodeSpawnedClones.set(id, []);
        nodeDirectBonusMap.set(id, 0);
        nodeUnilevelBonusMap.set(id, 0);

        if (!n.isClone && !n.isExtraId) {
          if (!ownerPrimaryNodeMap.has(ownerKey)) {
            ownerPrimaryNodeMap.set(ownerKey, n.id);
          }
          const existingMains = ownerAllMainNodesMap.get(ownerKey) || [];
          existingMains.push(n.id);
          ownerAllMainNodesMap.set(ownerKey, existingMains);

          originMainIdMap.set(n.id, n.id);
          spawnedFromMap.set(n.id, 0);
          cloneRoundMap.set(n.id, 0);
          subCloneDepthMap.set(n.id, 0);
        } else if (n.isClone) {
          const walletFirstId = ownerPrimaryNodeMap.get(ownerKey) || n.id;
          let spawnedFromNodeId = 0;

          for (let lookback = id - 1; lookback >= 1; lookback--) {
            const candidateRightChild = rawNodes.get(lookback);
            if (!candidateRightChild || candidateRightChild.parentId <= 0) continue;
            const triggerParent = rawNodes.get(candidateRightChild.parentId);
            if (
              triggerParent &&
              triggerParent.rightChild === candidateRightChild.id &&
              triggerParent.owner.toLowerCase() === ownerKey &&
              !matchedRightTriggers.has(triggerParent.id)
            ) {
              spawnedFromNodeId = triggerParent.id;
              matchedRightTriggers.add(triggerParent.id);
              break;
            }
          }

          if (spawnedFromNodeId === 0) {
            const ownerMains = ownerAllMainNodesMap.get(ownerKey) || [];
            const matchingSubtreeMain = [...ownerMains]
              .reverse()
              .find((mId) => mId < id && isAncestorOf(mId, id));
            spawnedFromNodeId = matchingSubtreeMain || walletFirstId;
          }

          const triggerIsClone = Boolean(rawNodes.get(spawnedFromNodeId)?.isClone);
          const originMainId = triggerIsClone
            ? originMainIdMap.get(spawnedFromNodeId) || walletFirstId
            : spawnedFromNodeId;
          const subCloneDepth = triggerIsClone
            ? (subCloneDepthMap.get(spawnedFromNodeId) || 0) + 1
            : 0;

          const prevCount = nodeCloneRoundCount.get(originMainId) || 0;
          const currentCount = prevCount + 1;
          nodeCloneRoundCount.set(originMainId, currentCount);
          const cloneRound = ((currentCount - 1) % 2) + 1;

          originMainIdMap.set(n.id, originMainId);
          spawnedFromMap.set(n.id, spawnedFromNodeId);
          cloneRoundMap.set(n.id, cloneRound);
          subCloneDepthMap.set(n.id, subCloneDepth);

          const list = nodeSpawnedClones.get(spawnedFromNodeId) || [];
          list.push({ cloneNodeId: n.id, round: cloneRound });
          nodeSpawnedClones.set(spawnedFromNodeId, list);
        } else {
          const walletFirstId = ownerPrimaryNodeMap.get(ownerKey) || n.id;
          originMainIdMap.set(n.id, walletFirstId);
          spawnedFromMap.set(n.id, 0);
          cloneRoundMap.set(n.id, 0);
          subCloneDepthMap.set(n.id, 0);
        }
      }

      // Helper to resolve the exact Sponsor Main Node ID using Clone Lineage (originMainIdMap)
      const resolveSponsorNodeIdForNode = (nodeId: number, sponsorAddr: string): number => {
        if (!sponsorAddr || sponsorAddr === ethers.ZeroAddress) return 0;
        const sponsorKey = sponsorAddr.toLowerCase();
        const n = rawNodes.get(nodeId);

        // If nodeId is a clone, it inherits the sponsor of its originMainId
        if (n && n.isClone) {
          const originMain = originMainIdMap.get(nodeId) || nodeId;
          if (originMain !== nodeId) {
            const originNode = rawNodes.get(originMain);
            if (originNode && originNode.owner.toLowerCase() === sponsorKey) {
              return originMain;
            }
            return resolveSponsorNodeIdForNode(originMain, sponsorAddr);
          }
        }

        const candidateMainIds = (ownerAllMainNodesMap.get(sponsorKey) || []).filter(
          (mId) => mId < nodeId
        );
        if (candidateMainIds.length === 0) {
          return ownerPrimaryNodeMap.get(sponsorKey) || 1;
        }
        if (candidateMainIds.length === 1) {
          return candidateMainIds[0];
        }

        // Walk up ancestors from nodeId.parentId; if any ancestor (Main ID or Clone) belongs to sponsorAddr, return its originMainId
        let curr = n?.parentId || 0;
        const visitedAnc = new Set<number>();
        while (curr > 0 && !visitedAnc.has(curr)) {
          visitedAnc.add(curr);
          const anc = rawNodes.get(curr);
          if (!anc) break;
          if (anc.owner.toLowerCase() === sponsorKey) {
            const ancOriginMain = originMainIdMap.get(anc.id) || anc.id;
            if (ancOriginMain < nodeId) {
              return ancOriginMain;
            }
          }
          curr = anc.parentId;
        }

        return candidateMainIds[0];
      };

      // Pass 2: Chronological simulation of Auto New Main IDs, Left-Child Direct (30%), Unilevel (15 tiers x 2%), and Vault Pools (35%)
      const rank1EntryPrice = RANK_PRICES_USDT[0] || 5;
      for (const id of sortedIds) {
        const n = rawNodes.get(id)!;
        const ownerKey = n.owner.toLowerCase();
        const firstMainOfOwner = ownerPrimaryNodeMap.get(ownerKey) || n.id;

        // 1. Check if this node was spawned as an Auto New Main ID from Vault 1-4 (checkAndProcessAutoNewMainId)
        if (!n.isClone && !n.isExtraId && n.id > firstMainOfOwner) {
          const isSelfSponsored = Boolean(
            n.directSponsor && n.directSponsor.toLowerCase() === ownerKey
          );
          if (isSelfSponsored) {
            // Find an existing Main ID of this owner whose Auto ID Vault has accumulated >= 5 USDT
            const priorMains = (ownerAllMainNodesMap.get(ownerKey) || []).filter(
              (mId) => mId < n.id
            );
            const sourceMain = priorMains.find(
              (mId) => (lineageAutoIdVault.get(mId) || 0) + 1e-9 >= rank1EntryPrice
            );
            if (sourceMain !== undefined) {
              autoMainNodeIds.add(n.id);
              autoIdSourceMainMap.set(n.id, sourceMain);
              mainNodeAutoIdSpawnCount.set(
                sourceMain,
                (mainNodeAutoIdSpawnCount.get(sourceMain) || 0) + 1
              );
              const currentAutoVault = lineageAutoIdVault.get(sourceMain) || 0;
              lineageAutoIdVault.set(
                sourceMain,
                Math.max(0, Number((currentAutoVault - rank1EntryPrice).toFixed(4)))
              );
            }
          }
        }

        if (n.isExtraId) {
          const originMain = originMainIdMap.get(n.id) || firstMainOfOwner;
          lineageExtraIdSpawnCount.set(
            originMain,
            (lineageExtraIdSpawnCount.get(originMain) || 0) + 1
          );
          const currentExtraVault = lineageExtraIdVault.get(originMain) || 0;
          if (currentExtraVault >= unitPrice) {
            lineageExtraIdVault.set(
              originMain,
              Math.max(0, Number((currentExtraVault - unitPrice).toFixed(4)))
            );
          }
        }

        // 2. If this node is placed as a Left Child, distribute 30% Direct, 30% Unilevel (15 levels), and 35% Vault
        if (n.parentId > 0) {
          const parent = rawNodes.get(n.parentId);
          if (parent && parent.leftChild === n.id) {
            // A. 30% Direct Referral (FractalFlowMatrix27.sol lines 1195-1211)
            // Rule: กรณีเฉพาะไอดีโคลนนิ่ง ID 1 เมื่อไปต่อฝั่งซ้ายของใครก็ตาม 30% ค่าแนะนำตรงจะถูกส่งไปที่ familyPool
            const isId1Clone =
              n.isClone &&
              (n.owner.toLowerCase() === rootOwnerKey || originMainIdMap.get(n.id) === 1);
            const hasSponsor = Boolean(
              n.directSponsor && n.directSponsor !== ethers.ZeroAddress
            );

            if (isId1Clone || !hasSponsor) {
              const targetLineage = originMainIdMap.get(n.id) || 1;
              lineageFamilyPoolDirectMap.set(
                targetLineage,
                Number(((lineageFamilyPoolDirectMap.get(targetLineage) || 0) + directBonusUnit).toFixed(4))
              );
            } else {
              const sponsorNodeId = resolveSponsorNodeIdForNode(n.id, n.directSponsor);
              if (sponsorNodeId > 0) {
                nodeDirectBonusMap.set(
                  sponsorNodeId,
                  Number(((nodeDirectBonusMap.get(sponsorNodeId) || 0) + directBonusUnit).toFixed(4))
                );
              }
            }

            // B. 15-Level Unilevel (2% per tier)
            let currUplineId = n.parentId;
            for (let tier = 1; tier <= 15 && currUplineId > 0; tier++) {
              nodeUnilevelBonusMap.set(
                currUplineId,
                Number(((nodeUnilevelBonusMap.get(currUplineId) || 0) + unilevelBonusUnit).toFixed(4))
              );
              const upNode = rawNodes.get(currUplineId);
              currUplineId = upNode ? upNode.parentId : 0;
            }

            // C. 35% Left-Child Upgrade Vault (FractalFlowMatrix27.sol lines 1230-1254)
            const parentOwnerKey = parent.owner.toLowerCase();
            const parentMainId = originMainIdMap.get(parent.id) || parent.id;
            lineageGrossVaultMap.set(
              parentMainId,
              Number(((lineageGrossVaultMap.get(parentMainId) || 0) + vaultUnit).toFixed(4))
            );

            const ownerMaxR = ownerMaxRankMap.get(parentOwnerKey) || 1;
            const hasUnlockedNextRank =
              parentOwnerKey === rootOwnerKey ||
              ownerMaxR > selectedRank ||
              Boolean(lineageHasUpgraded.get(parentMainId));

            if (!n.isExtraId && selectedRank < 27) {
              if (hasUnlockedNextRank) {
                if (selectedRank <= 4) {
                  lineageAutoIdVault.set(
                    parentMainId,
                    Number(((lineageAutoIdVault.get(parentMainId) || 0) + vaultUnit).toFixed(4))
                  );
                } else {
                  lineageExtraIdVault.set(
                    parentMainId,
                    Number(((lineageExtraIdVault.get(parentMainId) || 0) + vaultUnit).toFixed(4))
                  );
                }
              } else {
                const updatedUpgradeVault = Number(
                  ((lineageUpgradeVault.get(parentMainId) || 0) + vaultUnit).toFixed(4)
                );
                if (updatedUpgradeVault >= nextPrice) {
                  lineageHasUpgraded.set(parentMainId, true);
                  lineageUpgradeVault.set(parentMainId, 0);
                } else {
                  lineageUpgradeVault.set(parentMainId, updatedUpgradeVault);
                }
              }
            }
          }
        }
      }

      // Pass 3: Build EnrichedBinaryNode map
      const enrichedMap = new Map<number, EnrichedBinaryNode>();
      for (const id of sortedIds) {
        const n = rawNodes.get(id)!;
        const originMainId = originMainIdMap.get(n.id) || n.id;
        const spawnedFromNodeId = spawnedFromMap.get(n.id) || 0;
        const cloneRound = cloneRoundMap.get(n.id) || 0;
        const subCloneDepth = subCloneDepthMap.get(n.id) || 0;

        let depth = 1;
        let currP = n.parentId;
        const visited = new Set<number>();
        while (currP > 0 && !visited.has(currP)) {
          visited.add(currP);
          depth++;
          const pObj = rawNodes.get(currP);
          currP = pObj ? pObj.parentId : 0;
        }

        let isLeft = true;
        if (n.parentId > 0) {
          const pObj = rawNodes.get(n.parentId);
          if (pObj && pObj.rightChild === n.id) {
            isLeft = false;
          }
        }

        let directUplineNodeId = 0;
        if (autoIdSourceMainMap.has(n.id)) {
          directUplineNodeId = autoIdSourceMainMap.get(n.id)!;
        } else if (n.directSponsor && n.directSponsor !== ethers.ZeroAddress) {
          directUplineNodeId = resolveSponsorNodeIdForNode(n.id, n.directSponsor);
        }

        const hasLeftChild = n.leftChild > 0;
        const vaultBalance = hasLeftChild ? vaultUnit : 0;

        enrichedMap.set(n.id, {
          id: n.id,
          rank: selectedRank,
          level: depth,
          parentId: n.parentId,
          isLeft,
          owner: n.owner,
          directSponsor: n.directSponsor,
          leftChild: n.leftChild,
          rightChild: n.rightChild,
          isClone: n.isClone,
          isExtraId: n.isExtraId,
          isAutoMainId: autoMainNodeIds.has(n.id),
          originMainId,
          spawnedFromNodeId,
          cloneRound,
          subCloneDepth,
          spawnedCloneIds: nodeSpawnedClones.get(n.id) || [],
          directUplineNodeId,
          directRewardThisNode: nodeDirectBonusMap.get(n.id) || 0,
          unilevelRewardThisNode: nodeUnilevelBonusMap.get(n.id) || 0,
          directRewardAllNodes: 0,
          unilevelRewardAllNodes: 0,
          upgradeRankPool: 0,
          newAutoIdPool: 0,
          newExtraIdPool: 0,
          totalClonesCount: 0,
          totalAutoIdCount: 0,
          totalExtraIdCount: 0,
          vaultBalance,
          nextRankPrice: nextPrice,
          familyPoolDirectFromLineage: 0,
          grossVaultFromLineage: 0,
        });
      }

      // เงินแยกของใครของมัน: รหัสหลักแต่ละรหัส (Main ID และ New Main ID) แยกเงินและกระปุก Vault อิสระ
      // รวมเฉพาะโหนดในสายงานของรหัสหลักนั้น (other.originMainId === targetMainId) ไม่นำมารวมข้ามรหัสหลักอื่น
      for (const node of enrichedMap.values()) {
        const targetMainId = node.originMainId;
        let sumDirect = 0;
        let sumUnilevel = 0;
        for (const other of enrichedMap.values()) {
          if (other.originMainId === targetMainId) {
            sumDirect += other.directRewardThisNode;
            sumUnilevel += other.unilevelRewardThisNode;
          }
        }
        node.directRewardAllNodes = Number(sumDirect.toFixed(4));
        node.unilevelRewardAllNodes = Number(sumUnilevel.toFixed(4));
        node.upgradeRankPool = lineageUpgradeVault.get(targetMainId) || 0;
        node.newAutoIdPool = selectedRank <= 4 ? lineageAutoIdVault.get(targetMainId) || 0 : 0;
        node.newExtraIdPool = selectedRank >= 5 ? lineageExtraIdVault.get(targetMainId) || 0 : 0;
        node.totalClonesCount = nodeCloneRoundCount.get(targetMainId) || 0;
        node.totalAutoIdCount = mainNodeAutoIdSpawnCount.get(targetMainId) || 0;
        node.totalExtraIdCount = lineageExtraIdSpawnCount.get(targetMainId) || 0;
        node.familyPoolDirectFromLineage = lineageFamilyPoolDirectMap.get(targetMainId) || 0;
        node.grossVaultFromLineage = lineageGrossVaultMap.get(targetMainId) || 0;
      }

      setOnChainNodesMap(enrichedMap);
    } catch (err) {
      console.error('Error loading on-chain binary tree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  }, [getWorkingProvider, selectedRank]);

  useEffect(() => {
    loadOnChainTree();
  }, [loadOnChainTree]);

  // 1. Auto-refresh tree when registration or batch registration succeeds
  useEffect(() => {
    if (lastTxSuccess || refreshTrigger) {
      loadOnChainTree();
      setViewMode('onchain');
      setJustUpdatedBadge(true);
      const timer = setTimeout(() => setJustUpdatedBadge(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [lastTxSuccess, refreshTrigger, loadOnChainTree]);

  // 2. Global event listener dispatched whenever user registers or activates nodes
  useEffect(() => {
    const handleGlobalTreeRefresh = () => {
      loadOnChainTree();
      setViewMode('onchain');
      setJustUpdatedBadge(true);
      setTimeout(() => setJustUpdatedBadge(false), 6000);
    };

    window.addEventListener('matrix:tree:refresh', handleGlobalTreeRefresh);
    return () => {
      window.removeEventListener('matrix:tree:refresh', handleGlobalTreeRefresh);
    };
  }, [loadOnChainTree]);

  // Active nodes map based on viewMode ('onchain' or 'demoCloneTree')
  const activeNodesMap = useMemo(() => {
    if (viewMode === 'demoCloneTree') {
      return buildScreenshotPreviewNodes(selectedRank);
    }
    if (onChainNodesMap.size > 0) {
      return onChainNodesMap;
    }
    return buildScreenshotPreviewNodes(selectedRank);
  }, [viewMode, onChainNodesMap, selectedRank]);

  // Recalculate exact SVG connector lines between every Parent and its Left/Right children
  const recalculateTreeConnectors = useCallback(() => {
    const containerEl = treeContentRef.current;
    if (!containerEl) return;

    const containerRect = containerEl.getBoundingClientRect();
    const scale = zoomScale || 1;
    const width = containerEl.scrollWidth;
    const height = containerEl.scrollHeight;
    setTreeDimensions({ width, height });

    const newLines: ConnectorLine[] = [];
    const parentEls = containerEl.querySelectorAll<HTMLElement>('[data-node-anchor]');

    parentEls.forEach((parentEl) => {
      const parentIdStr = parentEl.getAttribute('data-node-anchor');
      if (!parentIdStr) return;
      const parentId = Number(parentIdStr);
      const parentNode = activeNodesMap.get(parentId);
      if (!parentNode) return;

      const pRect = parentEl.getBoundingClientRect();
      const x1 = (pRect.left - containerRect.left + pRect.width / 2) / scale;
      const y1 = (pRect.bottom - containerRect.top) / scale;

      const leftTargetEl =
        parentNode.leftChild > 0
          ? containerEl.querySelector<HTMLElement>(`[data-node-card="${parentNode.leftChild}"]`)
          : containerEl.querySelector<HTMLElement>(`[data-empty-slot="${parentId}-left"]`);

      if (leftTargetEl) {
        const lRect = leftTargetEl.getBoundingClientRect();
        const x2 = (lRect.left - containerRect.left + lRect.width / 2) / scale;
        const y2 = (lRect.top - containerRect.top) / scale;
        newLines.push({
          key: `line-${parentId}-left`,
          x1,
          y1,
          x2,
          y2,
          isLeft: true,
          isFilled: parentNode.leftChild > 0,
        });
      }

      const rightTargetEl =
        parentNode.rightChild > 0
          ? containerEl.querySelector<HTMLElement>(`[data-node-card="${parentNode.rightChild}"]`)
          : containerEl.querySelector<HTMLElement>(`[data-empty-slot="${parentId}-right"]`);

      if (rightTargetEl) {
        const rRect = rightTargetEl.getBoundingClientRect();
        const x2 = (rRect.left - containerRect.left + rRect.width / 2) / scale;
        const y2 = (rRect.top - containerRect.top) / scale;
        newLines.push({
          key: `line-${parentId}-right`,
          x1,
          y1,
          x2,
          y2,
          isLeft: false,
          isFilled: parentNode.rightChild > 0,
        });
      }
    });

    setConnectorLines(newLines);
  }, [activeNodesMap, zoomScale]);

  useLayoutEffect(() => {
    recalculateTreeConnectors();
    const timer = setTimeout(recalculateTreeConnectors, 60);
    return () => clearTimeout(timer);
  }, [
    recalculateTreeConnectors,
    focusRootId,
    expandedBenefitNodeId,
    viewMode,
    selectedRank,
    zoomScale,
  ]);

  useEffect(() => {
    const containerEl = treeContentRef.current;
    if (!containerEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      recalculateTreeConnectors();
    });
    observer.observe(containerEl);
    window.addEventListener('resize', recalculateTreeConnectors);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recalculateTreeConnectors);
    };
  }, [recalculateTreeConnectors]);

  const handleAutoFitScreen = useCallback(() => {
    const viewportEl = scrollViewportRef.current;
    const contentEl = treeContentRef.current;
    if (!viewportEl || !contentEl) return;

    const availableWidth = viewportEl.clientWidth - 24;
    const naturalWidth = contentEl.scrollWidth || 1;
    if (naturalWidth <= availableWidth) {
      setZoomScale(1);
    } else {
      const ratio = Math.max(0.55, Math.min(1, Number((availableWidth / naturalWidth).toFixed(2))));
      setZoomScale(ratio);
    }
  }, []);

  const navigateToNode = (targetId: number) => {
    if (!activeNodesMap.has(targetId)) return;
    setFocusRootId(targetId);
    setSearchInput(String(targetId));
    setNavigationHistory((prev) => {
      if (prev[prev.length - 1] === targetId) return prev;
      return [...prev, targetId];
    });
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 1) {
      const nextHist = navigationHistory.slice(0, -1);
      const prevId = nextHist[nextHist.length - 1];
      setNavigationHistory(nextHist);
      setFocusRootId(prevId);
      setSearchInput(String(prevId));
    } else {
      const currentRoot = activeNodesMap.get(focusRootId);
      if (currentRoot && currentRoot.parentId > 0) {
        navigateToNode(currentRoot.parentId);
      } else {
        navigateToNode(1);
      }
    }
  };

  const breadcrumbPath = useMemo(() => {
    const path: number[] = [];
    let curr = focusRootId;
    const visited = new Set<number>();
    while (curr > 0 && !visited.has(curr)) {
      visited.add(curr);
      path.unshift(curr);
      const node = activeNodesMap.get(curr);
      if (!node || node.parentId === 0) break;
      curr = node.parentId;
    }
    return path.length > 0 ? path : [1];
  }, [focusRootId, activeNodesMap]);

  const copyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // Render an Empty Slot card (ว่าง (ซ้าย) / ว่าง (ขวา))
  const renderEmptySlotCard = (parentNode: EnrichedBinaryNode, isLeftSlot: boolean) => {
    const sponsorIdToUse = parentNode.originMainId || parentNode.id || 1;
    const slotKey = `${parentNode.id}-${isLeftSlot ? 'left' : 'right'}`;

    return (
      <div
        data-empty-slot={slotKey}
        className="w-[140px] sm:w-[168px] h-auto rounded-2xl border border-dashed border-purple-500/45 bg-[#121629]/95 p-2.5 sm:p-3 flex flex-col items-center justify-center gap-2 shadow-lg relative z-10"
      >
        <span className="text-[11px] font-semibold text-slate-400">
          {isLeftSlot
            ? language === 'th'
              ? 'ว่าง (ซ้าย)'
              : 'Empty (Left)'
            : language === 'th'
            ? 'ว่าง (ขวา)'
            : 'Empty (Right)'}
        </span>
        <button
          type="button"
          onClick={() =>
            onRegisterWithSponsor &&
            onRegisterWithSponsor(sponsorIdToUse, {
              targetParentId: parentNode.id,
              isLeft: isLeftSlot,
            })
          }
          className={`w-full py-2 px-2.5 rounded-xl font-bold text-[11px] sm:text-xs text-white shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
            isLeftSlot
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-950/50'
              : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 shadow-purple-950/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isLeftSlot
              ? language === 'th'
                ? '+ ลงรหัสซ้าย'
                : '+ Place Left'
              : language === 'th'
              ? '+ ลงรหัสขวา'
              : '+ Place Right'}
          </span>
        </button>
      </div>
    );
  };

  // Render a single Node Card matching the exact Normal ID & Clone ID layouts from Screenshot 3
  const renderNodeCard = (node: EnrichedBinaryNode) => {
    const leftChildNode = node.leftChild > 0 ? activeNodesMap.get(node.leftChild) : undefined;
    const rightChildNode = node.rightChild > 0 ? activeNodesMap.get(node.rightChild) : undefined;
    const isMyNode =
      Boolean(userAddress) && node.owner.toLowerCase() === userAddress!.toLowerCase();
    const isBenefitOpen = expandedBenefitNodeId === node.id;

    const formatChildLabel = (child?: EnrichedBinaryNode, fallbackId?: number) => {
      if (!child && (!fallbackId || fallbackId === 0)) return '';
      if (!child) return `#${fallbackId}(${fallbackId})`;
      return `#${child.originMainId}(${child.id})`;
    };

    const borderStyle = node.isClone
      ? 'border-emerald-400/90 shadow-[0_0_26px_rgba(16,185,129,0.28)]'
      : node.isExtraId
      ? 'border-rose-500/80 shadow-[0_0_24px_rgba(244,63,94,0.22)]'
      : node.isAutoMainId
      ? 'border-amber-500/80 shadow-[0_0_24px_rgba(245,158,11,0.22)]'
      : 'border-slate-600/80 shadow-[0_8px_25px_rgba(2,6,23,0.9)]';

    return (
      <div
        data-node-anchor={node.id}
        className="flex flex-col items-center h-auto w-auto relative z-10"
      >
        {/* Main Node Card */}
        <div
          data-node-card={node.id}
          className={`relative w-[228px] sm:w-[254px] md:w-[266px] h-auto rounded-2xl bg-[#131829] border-2 ${borderStyle} p-3 sm:p-3.5 text-left transition-all duration-200 hover:border-indigo-400/80 select-none`}
        >
          {/* Top-Right Floating Pill Badge: CLONE ID (Green) vs NEW MANUAL ID (Purple) */}
          {node.isClone ? (
            <div className="absolute -top-3 right-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-[10px] font-black text-slate-950 shadow-md flex items-center gap-1 border border-emerald-200/50">
              <Dna className="w-3 h-3 text-slate-950" />
              <span>CLONE ID</span>
              <Sparkles className="w-2.5 h-2.5 text-slate-950" />
            </div>
          ) : (
            <div
              className={`absolute -top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-md flex items-center gap-1 ${
                node.isAutoMainId
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 border border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.4)]'
                  : node.isExtraId
                  ? 'bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 text-slate-950 border border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-500 text-white border border-purple-300/40'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>
                {node.isExtraId
                  ? 'NEW EXTRA ID'
                  : node.isAutoMainId
                  ? 'NEW AUTO ID'
                  : 'NEW MANUAL ID'}
              </span>
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          )}

          {/* Header Section */}
          {node.isClone ? (
            /* Clone Card 2-Row Header matching Screenshot 3:
               Row 1: [#7 #10 #0 [รอบ 1]]
               Row 2: [R1] [ชั้น 3] */
            <div className="space-y-2 pb-2 border-b border-slate-800/90 pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0d2324] border border-emerald-500/50 font-mono text-xs">
                <span className="font-extrabold text-amber-400">#{node.originMainId}</span>
                <span className="font-extrabold text-emerald-200">#{node.id}</span>
                <span className="font-bold text-emerald-400">#{node.subCloneDepth}</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 font-sans font-bold text-[11px]">
                  รอบ {node.cloneRound}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono font-bold text-[11px]">
                  R{node.rank}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-200 font-semibold">
                  ชั้น {node.level}
                </span>
              </div>
            </div>
          ) : (
            /* Normal Card Header matching Screenshot 3:
               Left: [#7 (7)] [R1]   Right: [ชั้น 3] */
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-800/90 pt-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => navigateToNode(node.id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/90 font-mono font-extrabold text-xs hover:border-amber-400 transition cursor-pointer"
                >
                  <span className="text-amber-400">#{node.originMainId}</span>{' '}
                  <span className="text-white">({node.id})</span>
                </button>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono font-bold text-[11px]">
                  R{node.rank}
                </span>
              </div>

              <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-200 font-semibold shrink-0">
                ชั้น {node.level}
              </span>
            </div>
          )}

          {/* Wallet Row */}
          <div className="mt-2 flex items-center justify-between text-xs sm:text-[13px] text-white font-mono px-0.5">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-bold truncate">Wallet {shortenWallet(node.owner)}</span>
            </div>
            <div className="flex items-center gap-1">
              {isMyNode && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  คุณ
                </span>
              )}
              <button
                type="button"
                onClick={() => copyAddress(node.owner)}
                className="text-slate-500 hover:text-white transition cursor-pointer"
                title={node.owner}
              >
                {copiedText === node.owner ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Info Box:
              - Normal Node: อัพไลน์ + ผู้แนะนำ
              - Clone Node: อัพไลน์ + รหัสหลัก (#originMainId) + ผู้แนะนำ */}
          <div className="mt-2 rounded-xl bg-[#0c1020] border border-slate-800/90 p-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">อัพไลน์:</span>
              <button
                type="button"
                onClick={() => node.parentId > 0 && navigateToNode(node.parentId)}
                className="font-mono font-extrabold text-indigo-400 hover:underline cursor-pointer"
              >
                {node.parentId === 0 ? 'Root (#0)' : `#${node.parentId}`}
              </button>
            </div>

            {/* รหัสหลัก row inside Clone ID card (matches Screenshot 3!) */}
            {node.isClone && (
              <div className="flex items-center justify-between">
                <span className="text-fuchsia-300 font-bold">รหัสหลัก:</span>
                <button
                  type="button"
                  onClick={() => navigateToNode(node.originMainId)}
                  className="font-mono font-extrabold text-amber-400 hover:underline cursor-pointer"
                  title={`คลิกเพื่อไปที่รหัสหลัก #${node.originMainId}`}
                >
                  #{node.originMainId}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span
                className={`font-bold ${
                  node.isClone ? 'text-emerald-400' : 'text-indigo-300'
                }`}
              >
                ผู้แนะนำ:
              </span>
              <button
                type="button"
                onClick={() =>
                  node.directUplineNodeId > 0 && navigateToNode(node.directUplineNodeId)
                }
                className="font-mono font-extrabold text-amber-400 hover:underline cursor-pointer"
              >
                {node.directUplineNodeId === 0 ? '#0' : `#${node.directUplineNodeId}`}
              </button>
            </div>
          </div>

          {/* 2-Column Left / Right Slot Box */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {/* Left Slot */}
            <div
              className={`rounded-xl p-2 flex flex-col justify-between h-auto ${
                node.leftChild > 0
                  ? 'bg-emerald-950/30 border border-emerald-500/45'
                  : 'bg-slate-950/60 border border-dashed border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-emerald-400 leading-tight">
                  ↙ ซ้าย (1)
                </span>

                {node.leftChild > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigateToNode(node.leftChild)}
                    className="font-mono font-extrabold text-xs text-emerald-300 hover:text-white transition cursor-pointer"
                  >
                    {formatChildLabel(leftChildNode, node.leftChild)}
                  </button>
                ) : activeLocks.some((l) => l.parentId === String(node.id) && l.isLeft) ? (
                  <span
                    className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-[9px] animate-pulse"
                    title="ตำแหน่งนี้กำลังถูกล็อคจองในระบบ FIFO Queue"
                  >
                    🔒 คิวจอง
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onRegisterWithSponsor &&
                      onRegisterWithSponsor(node.originMainId || node.id, {
                        targetParentId: node.id,
                        isLeft: true,
                      })
                    }
                    className="px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] shadow transition cursor-pointer"
                  >
                    +ลง
                  </button>
                )}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-300 font-mono leading-tight">
                30% | 15ช | 35%
              </div>
            </div>

            {/* Right Slot */}
            <div
              className={`rounded-xl p-2 flex flex-col justify-between h-auto ${
                node.rightChild > 0
                  ? 'bg-purple-950/35 border border-purple-500/50'
                  : 'bg-slate-950/60 border border-dashed border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-purple-300 leading-tight">
                  ↘ ขวา (2)
                </span>

                {node.rightChild > 0 ? (
                  <button
                    type="button"
                    onClick={() => navigateToNode(node.rightChild)}
                    className="font-mono font-extrabold text-xs text-purple-200 hover:text-white transition cursor-pointer"
                  >
                    {formatChildLabel(rightChildNode, node.rightChild)}
                  </button>
                ) : activeLocks.some((l) => l.parentId === String(node.id) && !l.isLeft) ? (
                  <span
                    className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-[9px] animate-pulse"
                    title="ตำแหน่งนี้กำลังถูกล็อคจองในระบบ FIFO Queue"
                  >
                    🔒 คิวจอง
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onRegisterWithSponsor &&
                      onRegisterWithSponsor(node.originMainId || node.id, {
                        targetParentId: node.id,
                        isLeft: false,
                      })
                    }
                    className="px-2 py-0.5 rounded-md bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-[10px] shadow transition cursor-pointer"
                  >
                    +ลง
                  </button>
                )}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-300 font-mono leading-tight">
                100% Rebirth
              </div>
            </div>
          </div>

          {/* Vault & Clone Count Pill Bar (Shown on Normal IDs or when Vault/Clone link is active) */}
          {!node.isClone && (
            <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-[#0c1020] border border-slate-800/90 flex items-center justify-between gap-1 text-[11px]">
              <span className="text-slate-200 font-mono flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Vault:{' '}
                  <strong className="text-white">
                    {node.upgradeRankPool > 0
                      ? `${node.upgradeRankPool.toFixed(2)}/${node.nextRankPrice}U`
                      : selectedRank <= 4 &&
                        (node.newAutoIdPool > 0 || node.totalAutoIdCount > 0 || node.id === 1)
                      ? `${node.newAutoIdPool.toFixed(2)}/5U`
                      : `${node.vaultBalance.toFixed(2)}/${node.nextRankPrice}U`}
                  </strong>
                </span>
              </span>
              {node.totalClonesCount > 0 || node.spawnedCloneIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    node.spawnedCloneIds[0] &&
                    navigateToNode(node.spawnedCloneIds[0].cloneNodeId)
                  }
                  className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>
                    ✨ โคลนนิ่ง {Math.max(node.totalClonesCount, node.spawnedCloneIds.length)} รหัส ↘
                  </span>
                </button>
              ) : (
                <span className="text-slate-500 font-medium text-[10px]">ปกติ</span>
              )}
            </div>
          )}

          {/* Toggle Benefit Details Button */}
          <button
            type="button"
            onClick={() =>
              setExpandedBenefitNodeId((prev) => (prev === node.id ? null : node.id))
            }
            className={`mt-2 w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition cursor-pointer ${
              isBenefitOpen
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-950/60'
                : 'bg-[#0c1020] hover:bg-slate-900 text-indigo-200 border border-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span>
                {isBenefitOpen ? 'ย่อรายละเอียดผลประโยชน์' : 'ดูรายละเอียดผลประโยชน์'}
              </span>
            </span>
            {isBenefitOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Expanded Benefit Details Popover Card (Auto Height & Responsive Width) */}
        {isBenefitOpen && (
          <div className="relative mt-2.5 w-[245px] sm:w-[290px] md:w-[308px] h-auto rounded-2xl bg-[#0d1222] border-2 border-indigo-500/45 p-3.5 sm:p-4 shadow-[0_15px_45px_rgba(0,0,0,0.85)] z-30 text-left space-y-3">
            {/* Top Pointer Arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-[#0d1222] border-l-2 border-t-2 border-indigo-500/45" />

            {/* Popover Header */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-extrabold text-white text-xs sm:text-sm">
                  รายละเอียดผลประโยชน์
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 font-mono font-extrabold text-amber-400 text-xs">
                  #{node.originMainId} ({node.id})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpandedBenefitNodeId(null)}
                className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Box 1: ผลประโยชน์เฉพาะรหัสนี้ */}
            <div className="rounded-xl bg-[#09191f] border border-emerald-500/40 p-2.5 sm:p-3 space-y-1.5 text-xs h-auto">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1">
                <span className="font-bold text-emerald-400">
                  {language === 'th'
                    ? `ผลประโยชน์เฉพาะรหัสนี้ (#${node.id})`
                    : `Earnings for This Node (#${node.id})`}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {node.isClone ? 'Clone ID' : node.isAutoMainId ? 'New Auto ID' : 'Main ID'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold">30% ค่าแนะนำตรง:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs sm:text-sm">
                  +{node.directRewardThisNode.toFixed(2)} U
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold">ยูนิเลเวล 15 ชั้น:</span>
                <span className="font-mono font-extrabold text-emerald-400 text-xs sm:text-sm">
                  +{node.unilevelRewardThisNode.toFixed(2)} U
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-emerald-500/15">
                <span className="text-slate-200 font-semibold">Vault โหนดนี้ (35% ลูกซ้าย):</span>
                <span className="font-mono font-extrabold text-amber-300 text-xs sm:text-sm">
                  +{node.vaultBalance.toFixed(2)} U
                </span>
              </div>
            </div>

            {/* Box 2: ผลประโยชน์สะสมเฉพาะรหัสหลักนี้ (#originMainId) — เงินแยกของใครของมัน */}
            <div className="rounded-xl bg-[#10162f] border border-indigo-500/40 p-2.5 sm:p-3 space-y-1.5 text-xs h-auto">
              <div className="border-b border-indigo-500/20 pb-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">
                    {language === 'th'
                      ? `ผลประโยชน์เฉพาะรหัสหลักนี้ (#${node.originMainId})`
                      : `Earnings for Main ID #${node.originMainId}`}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold">
                    แยกเงินอิสระ
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {language === 'th'
                    ? `เงินแยกของใครของมัน: รวมเฉพาะรหัสหลัก #${node.originMainId} และโคลนในสายงานนี้เท่านั้น ไม่ปนกับรหัสหลักอื่น`
                    : `Independent balance for Main ID #${node.originMainId} & its lineage clones (not pooled with other Main IDs)`}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold">30% ค่าแนะนำ (สายรหัสนี้):</span>
                <span className="font-mono font-extrabold text-indigo-300 text-xs sm:text-sm">
                  +{node.directRewardAllNodes.toFixed(2)} U
                </span>
              </div>

              {Boolean(node.familyPoolDirectFromLineage && node.familyPoolDirectFromLineage > 0) && (
                <div className="flex items-center justify-between text-[10px] text-amber-300/90">
                  <span>↳ โคลน #{node.originMainId} ลงซ้าย (เข้า Family Pool):</span>
                  <span className="font-mono font-bold">
                    {node.familyPoolDirectFromLineage?.toFixed(2)} U
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/90">
                <span className="text-slate-200 font-semibold">ยูนิเลเวล 15 ชั้น (สายรหัสนี้):</span>
                <span className="font-mono font-extrabold text-indigo-300 text-xs sm:text-sm">
                  +{node.unilevelRewardAllNodes.toFixed(2)} U
                </span>
              </div>

              {/* Pool Balances */}
              <div className="space-y-1 pt-0.5 pb-1.5 border-b border-slate-800/90">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold">Upgrade Rank Pool:</span>
                  <span className="font-mono font-extrabold text-amber-400">
                    {node.upgradeRankPool.toFixed(2)} U
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-yellow-400 font-bold">New Auto ID Pool (Vault 1-4):</span>
                  <span className="font-mono font-extrabold text-yellow-400">
                    {node.newAutoIdPool.toFixed(2)} U
                  </span>
                </div>
                {node.totalAutoIdCount > 0 && Boolean(node.grossVaultFromLineage) && (
                  <div className="text-[10px] text-slate-400 text-right font-mono">
                    (สะสม {node.grossVaultFromLineage?.toFixed(2)} U • ออก Auto ID -
                    {(node.totalAutoIdCount * 5).toFixed(2)} U)
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold">New Extra ID Pool:</span>
                  <span className="font-mono font-extrabold text-rose-400">
                    {node.newExtraIdPool.toFixed(2)} U
                  </span>
                </div>
              </div>

              {/* Clone & Special ID Counts */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-bold">จำนวนโคลนนิ่งของรหัสนี้:</span>
                  <span className="font-mono font-extrabold text-white">
                    {node.totalClonesCount} รหัส
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold">New Auto ID จากสายรหัสนี้:</span>
                  <span className="font-mono font-extrabold text-amber-400">
                    {node.totalAutoIdCount} รหัส
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-rose-400 font-bold">จำนวน New Extra ID:</span>
                  <span className="font-mono font-extrabold text-rose-400">
                    {node.totalExtraIdCount} รหัส
                  </span>
                </div>

                {node.isClone && (
                  <div className="pt-1.5 mt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-fuchsia-300 font-bold">รหัสหลักต้นสังกัดของโคลนนี้:</span>
                    <span className="font-mono font-bold text-amber-300">
                      #{node.originMainId} (โคลนรอบ {node.cloneRound})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Collapse Button */}
            <button
              type="button"
              onClick={() => setExpandedBenefitNodeId(null)}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
              <span>ย่อรายละเอียดผลประโยชน์</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Recursive Binary Subtree Renderer
  const renderBinarySubtree = (nodeId: number, currentDepth: number): React.ReactNode => {
    const node = activeNodesMap.get(nodeId);
    if (!node) return null;

    const maxDepth = maxRenderDepth || 8;
    const hasLeft = node.leftChild > 0 && activeNodesMap.has(node.leftChild);
    const hasRight = node.rightChild > 0 && activeNodesMap.has(node.rightChild);
    const showChildrenRow = currentDepth < maxDepth && (hasLeft || hasRight);

    return (
      <div className="inline-flex flex-col items-center h-auto w-auto">
        {renderNodeCard(node)}

        {showChildrenRow && (
          <div className="inline-flex items-start justify-center gap-3 sm:gap-5 md:gap-7 pt-7 sm:pt-9 h-auto w-auto">
            <div className="inline-flex flex-col items-center h-auto w-auto">
              {hasLeft
                ? renderBinarySubtree(node.leftChild, currentDepth + 1)
                : renderEmptySlotCard(node, true)}
            </div>
            <div className="inline-flex flex-col items-center h-auto w-auto">
              {hasRight
                ? renderBinarySubtree(node.rightChild, currentDepth + 1)
                : renderEmptySlotCard(node, false)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const allClonesInRank = useMemo(() => {
    return Array.from(activeNodesMap.values()).filter((n) => n.isClone);
  }, [activeNodesMap]);

  return (
    <div className="w-full h-auto bg-[#0b1020] border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 md:p-6 shadow-2xl space-y-3.5 sm:space-y-4">
      {/* Top Header & Rank Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-3.5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white flex items-center gap-2">
              <span>🌳 ผังต้นไม้ไบนารี่ 27 Ranks & รายละเอียดผลประโยชน์สะสม</span>
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
              Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
            </span>
            {justUpdatedBadge && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>สมัครสำเร็จ! ผังต้นไม้อัปเดตข้อมูลสดแล้ว (Synced)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            แสดงการ์ด NEW MANUAL ID และ CLONE ID พร้อมระบุ &ldquo;รหัสหลัก&rdquo; รอบโคลนนิ่ง และรายละเอียดผลประโยชน์สะสมครบถ้วน
          </p>
        </div>

        {/* Mode Switcher & Rank Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setViewMode('onchain');
              setFocusRootId(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              viewMode === 'onchain'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>ข้อมูลจริงบนเชน ({totalNodesInRank} โหนด)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('demoCloneTree');
              setFocusRootId(3);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              viewMode === 'demoCloneTree'
                ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-950/50'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>ดูตัวอย่าง #7 & โคลน #10</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <span className="text-[11px] text-slate-400 px-1 font-semibold">ความลึก:</span>
            {[4, 6, 8, 12].map((depthVal) => (
              <button
                key={depthVal}
                type="button"
                onClick={() => setMaxRenderDepth(depthVal)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                  maxRenderDepth === depthVal
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {depthVal} ชั้น
              </button>
            ))}
          </div>

          <select
            value={selectedRank}
            onChange={(e) => {
              setSelectedRank(Number(e.target.value));
              setFocusRootId(1);
            }}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-emerald-500"
          >
            {RANK_PRICES_USDT.map((price, i) => (
              <option key={i + 1} value={i + 1}>
                Rank {i + 1} ({price} USDT)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadOnChainTree}
            disabled={isLoadingTree}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Refresh On-Chain Tree"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTree ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. Node Structure Legend Box */}
      <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 px-3.5 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm h-auto">
        <span className="font-bold text-white">คำอธิบายโครงสร้างโหนด:</span>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="font-semibold text-emerald-400">รหัสโคลนนิ่ง (Rebirth)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
          <span className="font-semibold text-rose-400">New Extra ID (Vault 5–27)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
          <span className="font-semibold text-amber-400">New Main ID (Vault 1–4)</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-400" />
          <span className="font-semibold text-slate-300">รหัสทั่วไป</span>
        </div>
      </div>

      {/* 2. Navigation, Breadcrumb & Auto-Fit Bar */}
      <div className="rounded-2xl bg-[#11172a] border border-slate-800/90 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 h-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleGoBack}
            className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>ย้อนกลับผัง</span>
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = searchInput.trim();
              if (/^0x[a-fA-F0-9]{6,}$/.test(trimmed)) {
                const lower = trimmed.toLowerCase();
                const found = Array.from(activeNodesMap.values()).find((n) =>
                  n.owner.toLowerCase().startsWith(lower)
                );
                if (found) navigateToNode(found.id);
                return;
              }
              const target = parseInt(trimmed.replace(/[^0-9]/g, ''), 10);
              if (target >= 1) navigateToNode(target);
            }}
            className="flex items-center gap-1"
          >
            <input
              type="text"
              inputMode="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="#ID เช่น 22"
              className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 transition cursor-pointer"
              title="ค้นหาโหนด"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
            <span className="text-slate-400 font-medium">เส้นทางผัง:</span>
            {breadcrumbPath.map((nodeId, idx) => (
              <React.Fragment key={nodeId}>
                {idx > 0 && <span className="text-slate-600">→</span>}
                <button
                  type="button"
                  onClick={() => navigateToNode(nodeId)}
                  className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs transition cursor-pointer ${
                    nodeId === focusRootId
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  #{nodeId}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              title="ย่อผัง"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="text-[10px] font-mono text-slate-300 hover:text-white px-1.5 cursor-pointer"
              title="รีเซ็ตขนาด 100%"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(1.25, Number((z + 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
              title="ขยายผัง"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleAutoFitScreen}
              className="px-2 py-0.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
              title="ปรับขนาดให้พอดีหน้าจออัตโนมัติ"
            >
              <Maximize2 className="w-3 h-3" />
              <span>พอดีจอ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Clone Lineage Summary Strip */}
      {allClonesInRank.length > 0 && (
        <div className="rounded-2xl bg-emerald-950/25 border border-emerald-500/30 p-3 sm:p-3.5 space-y-2 h-auto">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Dna className="w-4 h-4 text-emerald-400" />
              <span>
                สรุปสถานะรหัสโคลนนิ่ง (Rebirth Clone Status) ใน Rank {selectedRank}: พบ{' '}
                {allClonesInRank.length} รหัสโคลน
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allClonesInRank.map((cloneNode) => (
              <div
                key={cloneNode.id}
                className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs h-auto"
              >
                <div className="space-y-0.5">
                  <div className="font-mono font-bold text-emerald-300 flex items-center gap-1.5 flex-wrap">
                    <span className="text-amber-400">#{cloneNode.originMainId}</span>
                    <span>#{cloneNode.id}</span>
                    <span>#{cloneNode.subCloneDepth}</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 text-[10px]">
                      รอบ {cloneNode.cloneRound}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    รหัสหลัก:{' '}
                    <span className="font-mono font-bold text-amber-300">
                      #{cloneNode.originMainId}
                    </span>{' '}
                    • อัพไลน์ #{cloneNode.parentId} ({cloneNode.isLeft ? 'ซ้าย' : 'ขวา'})
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateToNode(cloneNode.id)}
                    className="px-2 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 font-mono text-[10px] border border-emerald-500/40 cursor-pointer"
                  >
                    ดู #{cloneNode.id}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToNode(cloneNode.originMainId)}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[10px] border border-slate-700 cursor-pointer"
                  >
                    รหัสหลัก #{cloneNode.originMainId}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Main Auto-Height & Auto-Width Binary Tree Viewport */}
      <div
        ref={scrollViewportRef}
        className="w-full h-auto rounded-2xl sm:rounded-3xl bg-[#080c17] border border-slate-800/90 p-3 sm:p-6 md:p-8 overflow-x-auto overflow-y-visible matrix-scroll-container"
      >
        <div
          style={{
            zoom: zoomScale,
          }}
          className="w-max min-w-full h-auto flex justify-center items-start mx-auto"
        >
          <div
            ref={treeContentRef}
            className="relative inline-flex flex-col items-center h-auto w-max px-2 sm:px-4 py-3"
          >
            {/* Dynamic SVG Curved Connector Lines Overlay */}
            <svg
              className="absolute inset-0 pointer-events-none z-0 overflow-visible"
              width={treeDimensions.width || '100%'}
              height={treeDimensions.height || '100%'}
            >
              {connectorLines.map((line) => {
                const midY = line.y1 + (line.y2 - line.y1) * 0.5;
                const d = `M ${line.x1} ${line.y1} C ${line.x1} ${midY}, ${line.x2} ${midY}, ${line.x2} ${line.y2}`;
                const strokeColor = line.isFilled
                  ? line.isLeft
                    ? '#10b981'
                    : '#a855f7'
                  : '#64748b';

                return (
                  <path
                    key={line.key}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.2"
                    strokeDasharray={line.isFilled ? undefined : '5 5'}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Recursive Binary Tree Nodes */}
            {renderBinarySubtree(focusRootId, 1)}
          </div>
        </div>
      </div>
    </div>
  );
};
