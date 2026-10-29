import { ethers } from 'ethers';
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  USDT_ADDRESS,
  BSC_TESTNET_RPC,
  BSC_TESTNET_PARAMS,
} from '../contracts/config';

export type PlacementMode = 'auto_under_sponsor' | 'global_bfs' | 'contract_round';

export interface InMemoryMatrixNode {
  id: bigint;
  owner: string;
  directSponsor: string;
  parentId: bigint;
  leftChild: bigint;
  rightChild: bigint;
  isClone: boolean;
}

export interface WalletNodeDetail {
  id: string;
  owner: string;
  directSponsor: string;
  parentId: string;
  leftChild: string;
  rightChild: string;
  isClone: boolean;
}

export type RankNodesMap = Record<string, InMemoryMatrixNode>;

export interface OwnerProfileCache {
  sponsor: string;
  firstNodeId: bigint;
  latestNodeId: bigint;
}

export interface ApplicantItem {
  owner: string;
}

export interface SpawnedCloneStep {
  cloneNodeId: string;
  cloneOwner: string;
  triggeredByParentId: string;
  cloneParentId: string;
  cloneIsLeft: boolean;
}

export interface SimulationStepLog {
  applicantIndex: number;
  owner: string;
  assignedNodeId: string;
  targetParentId: string;
  isLeft: boolean;
  roundToggleUsed: number;
  spawnedClone?: {
    cloneNodeId: string;
    cloneOwner: string;
    cloneParentId: string;
    cloneIsLeft: boolean;
  };
  spawnedClones?: SpawnedCloneStep[];
}

const RPC_ENDPOINTS = [
  BSC_TESTNET_RPC,
  ...BSC_TESTNET_PARAMS.rpcUrls.filter((u) => u !== BSC_TESTNET_RPC),
];

async function getWorkingReadProvider(
  preferred?: ethers.Provider | ethers.Signer | null
): Promise<ethers.Provider> {
  if (preferred) {
    if ('provider' in preferred && preferred.provider) {
      return preferred.provider;
    }
    if ('getBlockNumber' in preferred) {
      return preferred as ethers.Provider;
    }
  }

  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const p = new ethers.JsonRpcProvider(
        rpcUrl,
        { chainId: 97, name: 'bnbt' },
        { staticNetwork: true }
      );
      await p.getBlockNumber();
      return p;
    } catch {
      continue;
    }
  }

  return new ethers.JsonRpcProvider(
    BSC_TESTNET_RPC,
    { chainId: 97, name: 'bnbt' },
    { staticNetwork: true }
  );
}

// --- 1. ฟังก์ชันค้นหาช่องว่างแบบ BFS (สแกนเรียงจาก Root #1 ซ้ายไปขวา อัตโนมัติ) ---
export function findFirstAvailableUnder(
  rankNodes: RankNodesMap,
  startNodeId: bigint | number
): { parentId: bigint; isLeft: boolean } {
  const startKey = BigInt(startNodeId || 1).toString();
  if (!rankNodes[startKey]) {
    // Fallback to root #1 if startNodeId is not in map
    if (rankNodes['1']) {
      return findFirstAvailableUnder(rankNodes, 1n);
    }
    return { parentId: 1n, isLeft: true };
  }

  const queue: bigint[] = [BigInt(startNodeId)];
  const visited = new Set<string>();
  let head = 0;

  while (head < queue.length) {
    const currentId = queue[head++];
    const key = currentId.toString();
    if (visited.has(key)) continue;
    visited.add(key);

    const node = rankNodes[key];
    if (!node) continue;

    if (node.leftChild === 0n) return { parentId: currentId, isLeft: true };
    if (node.rightChild === 0n) return { parentId: currentId, isLeft: false };

    if (node.leftChild > 0n) queue.push(node.leftChild);
    if (node.rightChild > 0n) queue.push(node.rightChild);
  }

  return { parentId: BigInt(startNodeId), isLeft: true };
}

// --- 2. ฟังก์ชันจำลองการหาตำแหน่งตามกฎ _findPlacementWithRound ของ Smart Contract ---
export function simulateSinglePlacement(
  rankNodes: RankNodesMap,
  sponsorAddress: string,
  sponsorFirstNodeId: bigint,
  _sponsorLatestNodeId: bigint,
  currentRoundToggle: number
): { parentId: bigint; isLeft: boolean } {
  if (currentRoundToggle === 0) {
    // การวางตำแหน่งรอบ 1: ต่อติดตัวของผู้แนะนำ (Direct Sponsor Line) และโคลนนิ่งของผู้แนะนำตรงเท่านั้น
    const result = findDirectSponsorOrCloneSlot(rankNodes, sponsorAddress, sponsorFirstNodeId);
    return { parentId: result.parentId, isLeft: result.isLeft };
  } else {
    // การวางตำแหน่งรอบ 2: ค้นหาแบบ "กว้างนำยาว" (BFS ทีละชั้นแนวระนาบ เริ่มจาก Root Node #1)
    return findFirstAvailableUnder(rankNodes, 1n);
  }
}

/**
 * เงื่อนไขสำหรับหาตำแหน่ง สมัครสมาชิก:
 * 1. จะต้องไปต่อติดตัวของผู้แนะนำตรง Direct Sponsor (ซ้ายก่อน ขวาตาม)
 * 2. แต่ถ้าผู้แนะนำตรง Direct Sponsor ไม่มีช่องว่าง (เต็มทั้ง 2 ข้าง) -> ให้ไปวางต่อติดตัวโคลนนิ่งของ Direct Sponsor เท่านั้น (ซ้ายก่อน ขวาตาม)
 */
export function findDirectSponsorOrCloneSlot(
  rankNodes: RankNodesMap,
  sponsorAddress: string,
  sponsorNodeId: number | bigint
): { parentId: bigint; isLeft: boolean; targetType: 'main' | 'clone' | 'descendant'; targetNodeId: bigint } {
  const sponsorKey = (sponsorAddress || '').toLowerCase();
  const mainNodeId = BigInt(sponsorNodeId || 1);
  const mainNode = rankNodes[mainNodeId.toString()];

  // 1. ต่อติดตัวของผู้แนะนำตรง Direct Sponsor (ซ้ายก่อน ขวาตาม)
  if (mainNode) {
    if (mainNode.leftChild === 0n) {
      return { parentId: mainNodeId, isLeft: true, targetType: 'main', targetNodeId: mainNodeId };
    }
    if (mainNode.rightChild === 0n) {
      return { parentId: mainNodeId, isLeft: false, targetType: 'main', targetNodeId: mainNodeId };
    }
  }

  // Helper: ตรวจสอบว่า nodeId อยู่ใต้สายงาน (subtree) ของ rootId หรือไม่
  const isNodeInSubtree = (targetId: bigint, rootId: bigint): boolean => {
    let curr = targetId;
    let hops = 0;
    while (curr > 0n && hops < 64) {
      if (curr === rootId) return true;
      const n = rankNodes[curr.toString()];
      if (!n) break;
      curr = n.parentId;
      hops++;
    }
    return false;
  };

  // 2. ตรวจสอบโคลนล่าสุดของผู้แนะนำตรง โดยให้ความสำคัญกับโคลนที่อยู่ในสายของ Main ID (#mainNodeId) นั้นก่อน
  const subtreeClones: Array<{ id: bigint; leftChild: bigint; rightChild: bigint }> = [];
  const allWalletClones: Array<{ id: bigint; leftChild: bigint; rightChild: bigint }> = [];

  for (const node of Object.values(rankNodes)) {
    if (
      node.isClone &&
      node.owner &&
      node.owner.toLowerCase() === sponsorKey
    ) {
      const item = {
        id: node.id,
        leftChild: node.leftChild,
        rightChild: node.rightChild,
      };
      if (isNodeInSubtree(node.id, mainNodeId)) {
        subtreeClones.push(item);
      }
      allWalletClones.push(item);
    }
  }

  subtreeClones.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));
  allWalletClones.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));

  const sponsorClones = subtreeClones.length > 0 ? subtreeClones : allWalletClones;

  if (sponsorClones.length > 0) {
    // หาโคลนที่มีช่องว่างซ้ายหรือขวาติดตัวก่อน
    const openClone = sponsorClones.find((c) => c.leftChild === 0n || c.rightChild === 0n);
    if (openClone) {
      if (openClone.leftChild === 0n) {
        return { parentId: openClone.id, isLeft: true, targetType: 'clone', targetNodeId: openClone.id };
      }
      return { parentId: openClone.id, isLeft: false, targetType: 'clone', targetNodeId: openClone.id };
    }
  }

  // 3. หากโหนดหลักและโคลนติดตัวเต็มหมด ให้หาช่องว่างแบบ BFS ใต้โหนดหลัก (#mainNodeId) ที่เลือกไว้โดยตรง
  const slot = findFirstAvailableUnder(rankNodes, mainNodeId);
  return { parentId: slot.parentId, isLeft: slot.isLeft, targetType: 'descendant', targetNodeId: mainNodeId };
}

// --- 3. ฟังก์ชันจำลองการเกิดรหัสโคลนนิ่งอัตโนมัติ (Recursive Right-Child Rebirth Clone) ---
function simulateRightChildCloneCascade(
  rankNodes: RankNodesMap,
  ownerProfiles: Record<string, OwnerProfileCache>,
  triggerParentId: bigint,
  state: { nextNodeId: bigint; currentToggle: number },
  spawnedList: SpawnedCloneStep[],
  depth = 0
) {
  if (depth > 16) return; // Safety guard
  const parentNode = rankNodes[triggerParentId.toString()];
  if (!parentNode) return;

  const parentOwner = parentNode.owner;
  const parentOwnerKey = parentOwner.toLowerCase();
  const parentProfile = ownerProfiles[parentOwnerKey];

  let parentSponsor =
    parentNode.directSponsor && parentNode.directSponsor !== ethers.ZeroAddress
      ? parentNode.directSponsor
      : parentProfile?.sponsor && parentProfile.sponsor !== ethers.ZeroAddress
      ? parentProfile.sponsor
      : parentOwner;

  if (!parentSponsor || parentSponsor === ethers.ZeroAddress) {
    parentSponsor = parentOwner;
  }

  const sponsorProfile = ownerProfiles[parentSponsor.toLowerCase()] || {
    sponsor: ethers.ZeroAddress,
    firstNodeId: triggerParentId,
    latestNodeId: triggerParentId,
  };

  const usedRound = state.currentToggle;
  state.currentToggle = usedRound === 0 ? 1 : 0;

  // ใช้ triggerParentId เป็นรหัสหลักต้นทางเมื่อเกิดโคลนจากลูกขวาของ New Main ID นั้น
  const effectiveOriginNodeId = !parentNode.isClone ? triggerParentId : sponsorProfile.firstNodeId;

  const clonePlacement = simulateSinglePlacement(
    rankNodes,
    parentSponsor,
    effectiveOriginNodeId,
    sponsorProfile.latestNodeId,
    usedRound
  );

  state.nextNodeId += 1n;
  const cloneNodeId = state.nextNodeId;
  const cloneKey = cloneNodeId.toString();

  rankNodes[cloneKey] = {
    id: cloneNodeId,
    owner: parentOwner,
    directSponsor: parentSponsor,
    parentId: clonePlacement.parentId,
    leftChild: 0n,
    rightChild: 0n,
    isClone: true,
  };

  const targetParentNode = rankNodes[clonePlacement.parentId.toString()];
  if (targetParentNode) {
    if (clonePlacement.isLeft) {
      targetParentNode.leftChild = cloneNodeId;
    } else {
      targetParentNode.rightChild = cloneNodeId;
    }
  }

  if (!ownerProfiles[parentOwnerKey]) {
    ownerProfiles[parentOwnerKey] = {
      sponsor: parentSponsor,
      firstNodeId: triggerParentId,
      latestNodeId: cloneNodeId,
    };
  } else {
    ownerProfiles[parentOwnerKey].latestNodeId = cloneNodeId;
  }

  spawnedList.push({
    cloneNodeId: cloneKey,
    cloneOwner: parentOwner,
    triggeredByParentId: triggerParentId.toString(),
    cloneParentId: clonePlacement.parentId.toString(),
    cloneIsLeft: clonePlacement.isLeft,
  });

  // If the clone itself landed on a RIGHT child slot, Solidity recursively triggers another clone!
  if (!clonePlacement.isLeft) {
    simulateRightChildCloneCascade(
      rankNodes,
      ownerProfiles,
      clonePlacement.parentId,
      state,
      spawnedList,
      depth + 1
    );
  }
}

// --- 4. โหลดข้อมูลผังไบนารี่จริงจาก Smart Contract แบบขนาน (Fast Parallel On-Chain Sync) ---
export async function loadOnChainRank1State(
  providerOrSigner: ethers.Provider | ethers.Signer | null,
  contractAddress: string = CONTRACT_ADDRESS,
  sponsorNodeId: number = 1
): Promise<{
  rankNodes: RankNodesMap;
  ownerProfiles: Record<string, OwnerProfileCache>;
  totalNodes: bigint;
  roundToggle: number;
  sponsorIsValid: boolean;
  sponsorReason: string;
  sponsorAddress: string;
}> {
  const provider = await getWorkingReadProvider(providerOrSigner);
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

  const [onChainTotal, onChainToggle, sponsorInfo] = await Promise.all([
    contract.totalNodesInRank(1).catch(() => 1n),
    contract
      .sponsorRoundToggle(1, sponsorNodeId)
      .catch(() => contract.placementRoundToggle(1).catch(() => 0)),
    contract
      .checkValidSponsorId(sponsorNodeId)
      .catch(() => [true, 'Valid main sponsor ID', ethers.ZeroAddress]),
  ]);

  let totalNodes = BigInt(onChainTotal || 1n);
  const roundToggle = Number(onChainToggle || 0);
  let sponsorIsValid = Boolean(sponsorInfo?.isValid ?? sponsorInfo?.[0] ?? true);
  let sponsorReason = String(sponsorInfo?.reason ?? sponsorInfo?.[1] ?? 'Valid main sponsor ID');
  let sponsorAddress = String(
    sponsorInfo?.sponsorAddress ?? sponsorInfo?.[2] ?? ethers.ZeroAddress
  );

  const count = Number(totalNodes);
  const ids = Array.from({ length: count }, (_, idx) => idx + 1);

  const rawNodesList = await Promise.all(
    ids.map(async (id) => {
      try {
        const n = await contract.rankNodes(1, id);
        return {
          id: BigInt(n.id ?? n[0]),
          owner: String(n.owner ?? n[1]),
          directSponsor: String(n.directSponsor ?? n[2]),
          parentId: BigInt(n.parentId ?? n[3]),
          leftChild: BigInt(n.leftChild ?? n[4]),
          rightChild: BigInt(n.rightChild ?? n[5]),
          isClone: Boolean(n.isClone ?? n[6]),
        };
      } catch {
        return null;
      }
    })
  );

  const rankNodes: RankNodesMap = {};
  const uniqueOwners = new Set<string>();

  for (const item of rawNodesList) {
    if (!item || item.id === 0n) continue;
    rankNodes[item.id.toString()] = item;
    if (item.owner && item.owner !== ethers.ZeroAddress) {
      uniqueOwners.add(item.owner.toLowerCase());
    }
  }

  // Fallback to backend API /api/matrix/nodes if direct browser RPC failed to return nodes
  if (Object.keys(rankNodes).length === 0) {
    try {
      const apiRes = await fetch('/api/matrix/nodes?rank=1');
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (Array.isArray(apiData.nodes) && apiData.nodes.length > 0) {
          for (const n of apiData.nodes) {
            const idBn = BigInt(n.id);
            rankNodes[String(n.id)] = {
              id: idBn,
              owner: String(n.owner),
              directSponsor: String(n.sponsor || ethers.ZeroAddress),
              parentId: BigInt(n.parentId || 0),
              leftChild: BigInt(n.leftChild || 0),
              rightChild: BigInt(n.rightChild || 0),
              isClone: Boolean(n.isClone),
            };
            if (n.owner && n.owner !== ethers.ZeroAddress) {
              uniqueOwners.add(String(n.owner).toLowerCase());
            }
          }
          totalNodes = BigInt(apiData.nodes.length);
        }
      }
    } catch {
      // Ignore API fallback error
    }
  }

  if (
    (!sponsorAddress || sponsorAddress === ethers.ZeroAddress) &&
    rankNodes[String(sponsorNodeId)]
  ) {
    const targetSponsorNode = rankNodes[String(sponsorNodeId)];
    sponsorAddress = targetSponsorNode.owner;
    sponsorIsValid = !targetSponsorNode.isClone;
    sponsorReason = sponsorIsValid
      ? 'Valid main sponsor ID'
      : 'Special nodes cannot be used as a sponsor';
  }

  if (sponsorAddress && sponsorAddress !== ethers.ZeroAddress) {
    uniqueOwners.add(sponsorAddress.toLowerCase());
  }

  const ownerProfiles: Record<string, OwnerProfileCache> = {};
  await Promise.all(
    Array.from(uniqueOwners).map(async (ownerKey) => {
      try {
        const prof = await contract.getUserProfile(ownerKey);
        ownerProfiles[ownerKey] = {
          sponsor: String(prof.sponsor ?? prof[1] ?? ethers.ZeroAddress),
          firstNodeId: BigInt(prof.mainNodeIdRank1 ?? prof[4] ?? 1),
          latestNodeId: BigInt(prof.latestCloneIdRank1 ?? prof[5] ?? 1),
        };
      } catch {
        // Fallback derived from rankNodes
      }
    })
  );

  // Ensure every owner has a profile entry even if getUserProfile failed
  for (const idStr of Object.keys(rankNodes)) {
    const node = rankNodes[idStr];
    const ownerKey = node.owner.toLowerCase();
    if (!ownerProfiles[ownerKey]) {
      ownerProfiles[ownerKey] = {
        sponsor: node.directSponsor,
        firstNodeId: node.id,
        latestNodeId: node.id,
      };
    }
  }

  // OVERLAY ACTIVE FIFO QUEUE RESERVATIONS (RACE CONDITION PROTECTION)
  try {
    const queueRes = await fetch('/api/queue/status');
    if (queueRes.ok) {
      const queueData = await queueRes.json();
      if (queueData.activeReservations && Array.isArray(queueData.activeReservations)) {
        const now = Date.now();
        for (const res of queueData.activeReservations) {
          if (res.status === 'RESERVED' && now <= res.expiresAt) {
            for (const item of res.batchDetails) {
              const pKey = String(item.targetParentId);
              if (rankNodes[pKey]) {
                if (item.isLeft) {
                  rankNodes[pKey].leftChild = BigInt(item.assignedNodeId);
                } else {
                  rankNodes[pKey].rightChild = BigInt(item.assignedNodeId);
                }
              }
              rankNodes[String(item.assignedNodeId)] = {
                id: BigInt(item.assignedNodeId),
                owner: item.owner,
                directSponsor: res.sponsorAddress,
                parentId: BigInt(item.targetParentId),
                leftChild: 0n,
                rightChild: 0n,
                isClone: Boolean(item.isClone),
              };
            }
          }
        }
      }
    }
  } catch {
    // Ignore queue fetch error in offline/disconnected environments
  }

  return {
    rankNodes,
    ownerProfiles,
    totalNodes,
    roundToggle,
    sponsorIsValid,
    sponsorReason,
    sponsorAddress,
  };
}

// --- 5. ฟังก์ชันค้นหาตำแหน่งที่จะลงออโต้ (Auto-Placement Preview สำหรับแสดงบน UI แบบ Real-Time) ---
export async function previewOffChainSimulation(
  providerOrSigner: ethers.Provider | ethers.Signer | null,
  contractAddress: string,
  sponsorNodeId: number,
  applicantsQueue: ApplicantItem[],
  onProgress: (msg: string) => void = () => {},
  mode: PlacementMode = 'contract_round'
) {
  let rankNodes: RankNodesMap = {};
  let ownerProfiles: Record<string, OwnerProfileCache> = {};
  let totalNodes = 1n;
  let roundToggle = 0;
  let sponsorIsValid = true;
  let sponsorReason = 'Valid main sponsor ID';
  let sponsorAddress = CONTRACT_ADDRESS;

  try {
    onProgress('กำลังค้นหาตำแหน่งว่างในผังไบนารี่แบบออโต้ (Auto-Placement Sync)...');
    const loaded = await loadOnChainRank1State(providerOrSigner, contractAddress, sponsorNodeId);
    rankNodes = loaded.rankNodes;
    ownerProfiles = loaded.ownerProfiles;
    totalNodes = loaded.totalNodes;
    roundToggle = loaded.roundToggle;
    sponsorIsValid = loaded.sponsorIsValid;
    sponsorReason = loaded.sponsorReason;
    sponsorAddress = loaded.sponsorAddress;
  } catch {
    onProgress('ใช้โครงสร้างจำลองเริ่มต้น (Fallback Memory State)...');
  }

  if (Object.keys(rankNodes).length === 0) {
    rankNodes['1'] = {
      id: 1n,
      owner: sponsorAddress,
      directSponsor: ethers.ZeroAddress,
      parentId: 0n,
      leftChild: 0n,
      rightChild: 0n,
      isClone: false,
    };
    totalNodes = 1n;
  }

  // Snapshot all real on-chain Rank 1 nodes before in-memory simulation
  const onChainNodesList: WalletNodeDetail[] = Object.values(rankNodes)
    .sort((a, b) => Number(a.id - b.id))
    .map((n) => ({
      id: n.id.toString(),
      owner: n.owner,
      directSponsor: n.directSponsor,
      parentId: n.parentId.toString(),
      leftChild: n.leftChild.toString(),
      rightChild: n.rightChild.toString(),
      isClone: n.isClone,
    }));

  const sponsorNodeDetail: WalletNodeDetail | null =
    onChainNodesList.find((n) => n.id === String(sponsorNodeId)) || null;

  const effectiveSponsorWallet = (
    sponsorNodeDetail?.owner ||
    sponsorAddress ||
    ''
  ).toLowerCase();

  const sponsorOwnedNodes: WalletNodeDetail[] = effectiveSponsorWallet
    ? onChainNodesList.filter((n) => n.owner.toLowerCase() === effectiveSponsorWallet)
    : [];

  const targetParentIds: bigint[] = [];
  const isLefts: boolean[] = [];
  const isClones: boolean[] = [];
  const stepLogs: SimulationStepLog[] = [];

  const simState = {
    nextNodeId: totalNodes,
    currentToggle: Number(roundToggle),
  };

  const count = Math.max(1, applicantsQueue.length);

  for (let i = 0; i < count; i++) {
    const applicant = applicantsQueue[i] || { owner: ethers.ZeroAddress };
    const usedRound = simState.currentToggle;

    let placement: { parentId: bigint; isLeft: boolean };

    if (mode === 'global_bfs') {
      // ค้นหาตำแหน่งว่างแบบออโต้จากชั้นบนสุดของผังรวม (#1)
      placement = findFirstAvailableUnder(rankNodes, 1n);
    } else if (mode === 'auto_under_sponsor') {
      placement = findFirstAvailableUnder(rankNodes, BigInt(sponsorNodeId || 1));
    } else {
      // เงื่อนไขสมัครสมาชิก: จะต้องไปต่อติดตัวของผู้แนะนำตรง Direct Sponsor ซ้ายก่อนขวา
      // แต่ถ้าผู้แนะนำตรง Direct Sponsor ไม่มีช่องว่าง ก็ให้ไปวางต่อติดตัวโคลนนิ่ง Direct Sponsor เท่านั้น
      const directOrClone = findDirectSponsorOrCloneSlot(
        rankNodes,
        sponsorAddress,
        BigInt(sponsorNodeId || 1)
      );
      placement = { parentId: directOrClone.parentId, isLeft: directOrClone.isLeft };
    }

    targetParentIds.push(placement.parentId);
    isLefts.push(placement.isLeft);
    isClones.push(false);

    simState.nextNodeId += 1n;
    const assignedNodeId = simState.nextNodeId;
    const newIdStr = assignedNodeId.toString();

    rankNodes[newIdStr] = {
      id: assignedNodeId,
      owner: applicant.owner,
      directSponsor: sponsorAddress,
      parentId: placement.parentId,
      leftChild: 0n,
      rightChild: 0n,
      isClone: false,
    };

    const applicantKey = (applicant.owner || '').toLowerCase();
    if (applicantKey) {
      if (!ownerProfiles[applicantKey]) {
        ownerProfiles[applicantKey] = {
          sponsor: sponsorAddress,
          firstNodeId: assignedNodeId,
          latestNodeId: assignedNodeId,
        };
      } else {
        ownerProfiles[applicantKey].latestNodeId = assignedNodeId;
      }
    }

    const spawnedClones: SpawnedCloneStep[] = [];

    if (placement.isLeft) {
      rankNodes[placement.parentId.toString()].leftChild = assignedNodeId;
    } else {
      rankNodes[placement.parentId.toString()].rightChild = assignedNodeId;

      // จำลองการเกิดรหัสโคลนนิ่งอัตโนมัติบน Smart Contract เมื่อลงฝั่งขวา (รวมกรณีเกิดโคลนซ้อนต่อเนื่อง)
      simulateRightChildCloneCascade(
        rankNodes,
        ownerProfiles,
        placement.parentId,
        simState,
        spawnedClones,
        0
      );
    }

    stepLogs.push({
      applicantIndex: i + 1,
      owner: applicant.owner,
      assignedNodeId: newIdStr,
      targetParentId: placement.parentId.toString(),
      isLeft: placement.isLeft,
      roundToggleUsed: usedRound,
      spawnedClone: spawnedClones[0]
        ? {
            cloneNodeId: spawnedClones[0].cloneNodeId,
            cloneOwner: spawnedClones[0].cloneOwner,
            cloneParentId: spawnedClones[0].cloneParentId,
            cloneIsLeft: spawnedClones[0].cloneIsLeft,
          }
        : undefined,
      spawnedClones,
    });
  }

  return {
    sponsorIsValid,
    sponsorReason,
    sponsorAddress: sponsorNodeDetail?.owner || sponsorAddress,
    roundToggle,
    totalNodesBefore: Number(totalNodes),
    targetParentIds: targetParentIds.map((id) => id.toString()),
    targetParentIdsBigInt: targetParentIds,
    isLefts,
    isClones,
    stepLogs,
    finalNodesCount: Number(simState.nextNodeId),
    onChainNodesList,
    sponsorNodeDetail,
    sponsorOwnedNodes,
  };
}

// --- 6. ฟังก์ชันหลักสำหรับคำนวณตำแหน่งออโต้และส่งธุรกรรมลง Smart Contract ---
export async function executeOffChainSimulationAndBatch(
  signer: ethers.Signer,
  contractAddress: string,
  sponsorNodeId: number,
  applicantsQueue: ApplicantItem[],
  onProgress: (msg: string) => void = () => {},
  mode: PlacementMode = 'contract_round'
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
  targetParentIds?: string[];
  isLefts?: boolean[];
  isClones?: boolean[];
  stepLogs?: SimulationStepLog[];
}> {
  try {
    const userAddress = await signer.getAddress();
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

    onProgress(`กำลังค้นหาตำแหน่งว่างออโต้ใต้ Sponsor #${sponsorNodeId}...`);
    const simResult = await previewOffChainSimulation(
      signer,
      contractAddress,
      sponsorNodeId,
      applicantsQueue,
      onProgress,
      mode
    );

    if (!simResult.sponsorIsValid) {
      throw new Error(`รหัสผู้แนะนำ #${sponsorNodeId} ไม่ถูกต้อง: ${simResult.sponsorReason}`);
    }

    const count = applicantsQueue.length;
    if (count === 0) throw new Error('จำนวนโหนดที่สมัครต้องมากกว่า 0');

    let rankPrice: bigint;
    try {
      rankPrice = await contract.rankPrice(1);
    } catch {
      rankPrice = ethers.parseUnits('5', 6);
    }

    let usdtAddress: string = USDT_ADDRESS;
    try {
      usdtAddress = await contract.usdt();
    } catch {
      usdtAddress = USDT_ADDRESS;
    }

    const totalCost = rankPrice * BigInt(count);

    onProgress('กำลังตรวจสอบยอด USDT และวงเงินอนุมัติ (Allowance)...');
    const usdtContract = new ethers.Contract(
      usdtAddress,
      [
        'function balanceOf(address account) view returns (uint256)',
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function decimals() view returns (uint8)',
      ],
      signer
    );

    let usdtDecimals = 6;
    try {
      usdtDecimals = Number(await usdtContract.decimals());
    } catch {
      usdtDecimals = 6;
    }

    const usdtBalance: bigint = await usdtContract.balanceOf(userAddress);
    if (usdtBalance < totalCost) {
      throw new Error(
        `ยอดเหรียญ USDT ไม่เพียงพอ! คุณมี ${Number(
          ethers.formatUnits(usdtBalance, usdtDecimals)
        ).toFixed(2)} USDT แต่ต้องใช้ ${Number(
          ethers.formatUnits(totalCost, usdtDecimals)
        ).toFixed(2)} USDT`
      );
    }

    const currentAllowance: bigint = await usdtContract.allowance(userAddress, contractAddress);
    if (currentAllowance < totalCost) {
      onProgress('ขั้นตอนที่ 1/2: กรุณากดยืนยัน (Approve USDT) ในกระเป๋า MetaMask...');
      const approveTx = await usdtContract.approve(contractAddress, totalCost * 10n);
      onProgress('กำลังรอการยืนยัน Approve USDT บนบล็อกเชน...');
      await approveTx.wait();
    }

    // เงื่อนไขระบบคิว: พอถึงคิวส่ง ให้เรียกใช้ฟังชั่น 'ออโต้ตามรอบสัญญา' (previewPlacement) อีกรอบก่อนส่ง
    if (mode === 'contract_round') {
      try {
        onProgress('ถึงคิวส่งแล้ว! กำลังเรียกใช้ฟังก์ชัน "ออโต้ตามรอบสัญญา" (previewPlacement) ตรวจสอบอีกรอบก่อนส่ง...');
        const preview = await contract.previewPlacement(1, simResult.sponsorAddress);
        const liveParent = String(preview.targetParentId ?? preview[0]);
        const liveLeft = Boolean(preview.isLeft ?? preview[1]);
        const liveRound = Number(preview.activeRound ?? preview[2] ?? 0);

        if (liveParent && liveParent !== '0' && simResult.targetParentIds.length > 0) {
          simResult.targetParentIds[0] = liveParent;
          simResult.targetParentIdsBigInt[0] = BigInt(liveParent);
          simResult.isLefts[0] = liveLeft;
          onProgress(`ผลรอบสัญญา #${liveRound} ล่าสุด: ยืนยันลงตำแหน่ง Parent #${liveParent} (${liveLeft ? 'ซ้าย' : 'ขวา'})`);
        }
      } catch (cpErr) {
        console.warn('Notice re-verifying contract round before sending batch:', cpErr);
      }
    }

    const firstParent = simResult.targetParentIds[0];
    const firstSide = simResult.isLefts[0] ? 'LEFT ลูกซ้าย' : 'RIGHT ลูกขวา';
    onProgress(
      `ขั้นตอนที่ 2/2: กำลังส่งธุรกรรมลงตำแหน่งออโต้ Parent #${firstParent} (${firstSide})... กรุณายืนยันใน MetaMask`
    );

    const tx = await contract.registerBatch(
      BigInt(sponsorNodeId),
      BigInt(count),
      simResult.targetParentIdsBigInt,
      simResult.isLefts,
      simResult.isClones
    );

    onProgress('ส่งธุรกรรมสำเร็จ กำลังรอการยืนยันจากบล็อกเชน BNB Testnet...');
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      targetParentIds: simResult.targetParentIds,
      isLefts: simResult.isLefts,
      isClones: simResult.isClones,
      stepLogs: simResult.stepLogs,
    };
  } catch (error: any) {
    console.error('Auto-Placement & Batch Registration Error:', error);
    return {
      success: false,
      error: error?.reason || error?.shortMessage || error?.message || 'เกิดข้อผิดพลาดในการสมัคร',
    };
  }
}
