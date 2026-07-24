import {
  ApprovalStepStatus,
  ParticipantRole,
  PrismaClient,
  ProposalGroup,
  ProposalStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { resolveDatabaseUrl } from '../src/config/database-url';

const ALL_PERMISSIONS = [
  'dashboard.view',
  'proposal.view',
  'proposal.view_all',
  'proposal.create',
  'proposal.approve',
  'proposal.pay',
  'report.view',
  'department.manage',
  'user.manage',
  'role.manage',
  'proposal_type.manage',
  'workflow.manage',
];

const pool = new Pool({ connectionString: resolveDatabaseUrl() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

const FINANCE_TYPES = [
  'Đề nghị thanh toán',
  'Đề nghị tạm ứng',
  'Đề nghị hoàn ứng',
  'Đề nghị hoàn trả chi phí',
  'Đề nghị quyết toán công tác phí',
  'Đề nghị thanh toán chi phí tiếp khách',
  'Đề nghị thanh toán chi phí đào tạo',
  'Đề nghị thanh toán chi phí vận chuyển',
  'Đề nghị thanh toán hóa đơn nhà cung cấp',
  'Đề nghị thanh toán hợp đồng',
  'Đề nghị thanh toán lương ngoài giờ',
  'Đề nghị thanh toán thưởng',
  'Đề nghị thanh toán phụ cấp',
  'Đề nghị thanh toán chi phí sửa chữa',
  'Đề nghị thanh toán chi phí bảo trì',
  'Đề nghị hoàn tiền cho khách hàng',
  'Đề nghị thu hồi công nợ',
  'Đề nghị đối chiếu công nợ',
  'Đề nghị điều chỉnh ngân sách',
  'Đề nghị cấp ngân sách',
];

const PROCUREMENT_TYPES = [
  'Đề nghị mua sắm vật tư',
  'Đề nghị mua sắm thiết bị',
  'Đề nghị mua văn phòng phẩm',
  'Đề nghị thuê dịch vụ',
  'Đề nghị ký hợp đồng mua hàng',
];

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

type SampleApprovalStep = {
  stepOrder: number;
  approverId: string;
  status: ApprovalStepStatus;
  comment?: string;
};

type SampleParticipant = {
  userId: string;
  role: ParticipantRole;
};

type SampleProposal = {
  code: string;
  title: string;
  status: ProposalStatus;
  typeCode: string;
  creatorId: string;
  departmentId: string;
  projectName?: string;
  content?: string;
  paymentAmount?: number;
  paymentContent?: string;
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  contractRef?: string;
  invoiceRef?: string;
  currentStepOrder?: number;
  participants?: SampleParticipant[];
  approvalSteps?: SampleApprovalStep[];
  daysAgo?: number;
};

async function seedSampleProposals(
  samples: SampleProposal[],
  workflowByTypeCode: Map<string, string>,
) {
  for (const s of samples) {
    const type = await prisma.proposalType.findFirst({
      where: { code: s.typeCode },
    });
    if (!type) continue;

    const workflowId = workflowByTypeCode.get(s.typeCode);
    if (!workflowId) continue;

    await prisma.proposal.deleteMany({ where: { code: s.code } });

    const createdAt = new Date();
    if (s.daysAgo) createdAt.setDate(createdAt.getDate() - s.daysAgo);

    await prisma.proposal.create({
      data: {
        code: s.code,
        title: s.title,
        status: s.status,
        proposalTypeId: type.id,
        workflowId,
        creatorId: s.creatorId,
        departmentId: s.departmentId,
        projectName: s.projectName,
        content: s.content,
        paymentAmount: s.paymentAmount,
        paymentContent: s.paymentContent,
        accountHolder: s.accountHolder,
        bankName: s.bankName,
        accountNumber: s.accountNumber,
        contractRef: s.contractRef,
        invoiceRef: s.invoiceRef,
        currentStepOrder: s.currentStepOrder ?? 0,
        createdAt,
        participants: s.participants?.length
          ? { create: s.participants }
          : undefined,
        approvalSteps: s.approvalSteps?.length
          ? {
              create: s.approvalSteps.map((step) => ({
                stepOrder: step.stepOrder,
                approverId: step.approverId,
                status: step.status,
                comment: step.comment,
                actedAt:
                  step.status !== ApprovalStepStatus.PENDING
                    ? new Date(createdAt.getTime() + step.stepOrder * 3600000)
                    : undefined,
              })),
            }
          : undefined,
      },
    });
  }
}

async function seedWorkflowParticipants(
  workflowId: string,
  watcherId: string,
  notifyId: string,
  executorId: string,
) {
  await prisma.approvalWorkflowParticipant.deleteMany({
    where: { workflowId },
  });
  await prisma.approvalWorkflowParticipant.createMany({
    data: [
      { workflowId, userId: watcherId, role: ParticipantRole.WATCHER },
      { workflowId, userId: notifyId, role: ParticipantRole.NOTIFY },
      { workflowId, userId: executorId, role: ParticipantRole.EXECUTOR },
    ],
  });
}

async function main() {
  const dept = await prisma.department.upsert({
    where: { name: 'SICOM' },
    update: {},
    create: { name: 'SICOM' },
  });

  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {
      name: 'Quản trị viên',
      description: 'Toàn quyền hệ thống',
      permissions: ALL_PERMISSIONS,
      canCreateProposal: true,
      canApprove: true,
      sortOrder: 1,
    },
    create: {
      code: 'ADMIN',
      name: 'Quản trị viên',
      description: 'Toàn quyền hệ thống',
      permissions: ALL_PERMISSIONS,
      canCreateProposal: true,
      canApprove: true,
      sortOrder: 1,
    },
  });
  const managerRole = await prisma.role.upsert({
    where: { code: 'MANAGER' },
    update: {
      name: 'Quản lý',
      description: 'Quản lý phòng ban',
      permissions: [
        'dashboard.view',
        'proposal.view',
        'proposal.create',
        'proposal.approve',
        'proposal.pay',
        'report.view',
      ],
      canCreateProposal: true,
      canApprove: true,
      sortOrder: 2,
    },
    create: {
      code: 'MANAGER',
      name: 'Quản lý',
      description: 'Quản lý phòng ban',
      permissions: [
        'dashboard.view',
        'proposal.view',
        'proposal.create',
        'proposal.approve',
        'proposal.pay',
        'report.view',
      ],
      canCreateProposal: true,
      canApprove: true,
      sortOrder: 2,
    },
  });
  const financeRole = await prisma.role.upsert({
    where: { code: 'FINANCE' },
    update: {
      name: 'Kế toán',
      description: 'Phòng tài chính kế toán',
      permissions: [
        'dashboard.view',
        'proposal.view',
        'proposal.create',
        'proposal.approve',
        'report.view',
      ],
      canCreateProposal: true,
      canApprove: true,
      sortOrder: 3,
    },
    create: {
      code: 'FINANCE',
      name: 'Kế toán',
      description: 'Phòng tài chính kế toán',
      permissions: [
        'dashboard.view',
        'proposal.view',
        'proposal.create',
        'proposal.approve',
        'report.view',
      ],
      canCreateProposal: true,
      canApprove: true,
      sortOrder: 3,
    },
  });
  const employeeRole = await prisma.role.upsert({
    where: { code: 'EMPLOYEE' },
    update: {
      name: 'Nhân viên',
      description: 'Nhân viên thông thường',
      permissions: ['dashboard.view', 'proposal.view', 'proposal.create'],
      canCreateProposal: true,
      canApprove: false,
      sortOrder: 4,
    },
    create: {
      code: 'EMPLOYEE',
      name: 'Nhân viên',
      description: 'Nhân viên thông thường',
      permissions: ['dashboard.view', 'proposal.view', 'proposal.create'],
      canCreateProposal: true,
      canApprove: false,
      sortOrder: 4,
    },
  });

  const passwordHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@finance.local' },
    update: {},
    create: {
      email: 'admin@finance.local',
      passwordHash,
      fullName: 'Quản trị Sicom',
      roleId: adminRole.id,
      canCreateProposal: true,
      canApprove: true,
      departmentId: dept.id,
    },
  });

  const approver = await prisma.user.upsert({
    where: { email: 'hoan.nguyen@sicom.local' },
    update: {},
    create: {
      email: 'hoan.nguyen@sicom.local',
      passwordHash,
      fullName: 'Nguyễn Thị Hoan',
      roleId: managerRole.id,
      canCreateProposal: true,
      canApprove: true,
      departmentId: dept.id,
    },
  });

  const financeUser = await prisma.user.upsert({
    where: { email: 'vietanh.tran@sicom.local' },
    update: {},
    create: {
      email: 'vietanh.tran@sicom.local',
      passwordHash,
      fullName: 'Trần Việt Anh',
      roleId: financeRole.id,
      canCreateProposal: true,
      canApprove: true,
      departmentId: dept.id,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'nhanvien@sicom.local' },
    update: {},
    create: {
      email: 'nhanvien@sicom.local',
      passwordHash,
      fullName: 'Nhân viên mẫu',
      roleId: employeeRole.id,
      canCreateProposal: true,
      canApprove: false,
      departmentId: dept.id,
    },
  });

  let sort = 0;
  for (const name of FINANCE_TYPES) {
    const code = `finance_${slugify(name)}`;
    await prisma.proposalType.upsert({
      where: { code },
      update: { name, sortOrder: sort++ },
      create: {
        code,
        name,
        group: ProposalGroup.FINANCE,
        sortOrder: sort - 1,
      },
    });
  }

  for (const name of PROCUREMENT_TYPES) {
    const code = `procurement_${slugify(name)}`;
    await prisma.proposalType.upsert({
      where: { code },
      update: { name, sortOrder: sort++ },
      create: {
        code,
        name,
        group: ProposalGroup.PROCUREMENT,
        sortOrder: sort - 1,
      },
    });
  }

  const paymentType = await prisma.proposalType.findFirst({
    where: { code: 'finance_de_nghi_thanh_toan' },
  });

  if (paymentType) {
    const workflow = await prisma.approvalWorkflow.upsert({
      where: { id: 'default-payment-workflow' },
      update: {},
      create: {
        id: 'default-payment-workflow',
        name: 'Quy trình thanh toán mặc định',
        proposalTypeId: paymentType.id,
        isSequential: true,
      },
    });

    await prisma.approvalWorkflowStep.upsert({
      where: {
        workflowId_stepOrder: { workflowId: workflow.id, stepOrder: 1 },
      },
      update: { approverId: approver.id },
      create: {
        workflowId: workflow.id,
        stepOrder: 1,
        label: 'Người xét duyệt cấp 1',
        approverId: approver.id,
        isSeniorApprover: false,
      },
    });

    await prisma.approvalWorkflowStep.upsert({
      where: {
        workflowId_stepOrder: { workflowId: workflow.id, stepOrder: 2 },
      },
      update: { approverId: financeUser.id, isSeniorApprover: true },
      create: {
        workflowId: workflow.id,
        stepOrder: 2,
        label: 'Người duyệt cấp cao',
        approverId: financeUser.id,
        isSeniorApprover: true,
      },
    });
  }

  const allTypes = await prisma.proposalType.findMany();
  for (const type of allTypes) {
    const hasWorkflow = await prisma.approvalWorkflow.findFirst({
      where: { proposalTypeId: type.id, isActive: true },
    });
    if (hasWorkflow) continue;

    const workflow = await prisma.approvalWorkflow.create({
      data: {
        name: `Quy trình mặc định - ${type.name}`,
        proposalTypeId: type.id,
        isSequential: true,
      },
    });

    await prisma.approvalWorkflowStep.createMany({
      data: [
        {
          workflowId: workflow.id,
          stepOrder: 1,
          label: 'Người xét duyệt cấp 1',
          approverId: approver.id,
          isSeniorApprover: false,
        },
        {
          workflowId: workflow.id,
          stepOrder: 2,
          label: 'Người duyệt cấp cao',
          approverId: financeUser.id,
          isSeniorApprover: true,
        },
      ],
    });
  }

  const workflowByTypeCode = new Map<string, string>();
  const workflows = await prisma.approvalWorkflow.findMany({
    where: { isActive: true },
    include: { proposalType: true },
  });
  for (const w of workflows) {
    workflowByTypeCode.set(w.proposalType.code, w.id);
    await seedWorkflowParticipants(
      w.id,
      admin.id,
      financeUser.id,
      approver.id,
    );
  }

  const bank = {
    accountHolder: 'Công ty TNHH SICOM',
    bankName: 'Vietcombank - CN Hà Nội',
    accountNumber: '0123456789',
  };

  await seedSampleProposals(
    [
      {
        code: 'DX-SEED-0001',
        title: 'Thanh toán chi phí văn phòng tháng 6/2026',
        status: ProposalStatus.DRAFT,
        typeCode: 'finance_de_nghi_thanh_toan',
        creatorId: employee.id,
        departmentId: dept.id,
        projectName: 'Vận hành văn phòng',
        content: 'Thanh toán điện nước, internet tháng 6.',
        paymentAmount: 18500000,
        paymentContent: 'Hóa đơn EVN + Viettel',
        ...bank,
        daysAgo: 1,
      },
      {
        code: 'DX-SEED-0002',
        title: 'Mua giấy A4 và bút bi cho phòng Kế toán',
        status: ProposalStatus.DRAFT,
        typeCode: 'procurement_de_nghi_mua_van_phong_pham',
        creatorId: employee.id,
        departmentId: dept.id,
        projectName: 'Văn phòng phẩm Q2',
        paymentAmount: 3200000,
        paymentContent: 'Đặt hàng NCC Thiên Long',
        daysAgo: 2,
      },
      {
        code: 'DX-SEED-0003',
        title: 'Thanh toán hóa đơn nhà cung cấp ABC Corp',
        status: ProposalStatus.PENDING,
        typeCode: 'finance_de_nghi_thanh_toan_hoa_don_nha_cung_cap',
        creatorId: employee.id,
        departmentId: dept.id,
        projectName: 'Dự án triển khai ERP',
        content: 'Thanh toán đợt 2 theo hợp đồng số HĐ-2026/03.',
        paymentAmount: 125000000,
        paymentContent: 'Hóa đơn GTGT số 0001245',
        invoiceRef: 'HD-0001245',
        contractRef: 'HĐ-2026/03',
        currentStepOrder: 1,
        participants: [
          { userId: admin.id, role: ParticipantRole.WATCHER },
          { userId: financeUser.id, role: ParticipantRole.NOTIFY },
        ],
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.PENDING,
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.PENDING,
          },
        ],
        daysAgo: 3,
      },
      {
        code: 'DX-SEED-0004',
        title: 'Tạm ứng công tác Hải Phòng - anh Tuấn',
        status: ProposalStatus.PENDING,
        typeCode: 'finance_de_nghi_tam_ung',
        creatorId: employee.id,
        departmentId: dept.id,
        projectName: 'Khảo sát hiện trường',
        paymentAmount: 15000000,
        paymentContent: 'Tạm ứng 5 ngày công tác',
        accountHolder: 'Nguyễn Văn Tuấn',
        bankName: 'Techcombank',
        accountNumber: '1903456789012',
        currentStepOrder: 2,
        participants: [
          { userId: approver.id, role: ParticipantRole.WATCHER },
        ],
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.APPROVED,
            comment: 'Đồng ý tạm ứng theo kế hoạch công tác.',
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.PENDING,
          },
        ],
        daysAgo: 5,
      },
      {
        code: 'DX-SEED-0005',
        title: 'Hoàn ứng chi phí công tác Đà Nẵng',
        status: ProposalStatus.PAID,
        typeCode: 'finance_de_nghi_hoan_ung',
        creatorId: employee.id,
        departmentId: dept.id,
        projectName: 'Triển khai khách hàng DN',
        paymentAmount: 8750000,
        paymentContent: 'Hoàn ứng sau quyết toán công tác',
        currentStepOrder: 2,
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.APPROVED,
            comment: 'Chi phí hợp lý, đúng quy định.',
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.APPROVED,
            comment: 'Đã kiểm tra chứng từ, chuyển khoản.',
          },
        ],
        daysAgo: 12,
      },
      {
        code: 'DX-SEED-0006',
        title: 'Mua laptop Dell cho nhân viên mới',
        status: ProposalStatus.PENDING_PAYMENT,
        typeCode: 'procurement_de_nghi_mua_sam_thiet_bi',
        creatorId: admin.id,
        departmentId: dept.id,
        projectName: 'Tuyển dụng Q2/2026',
        paymentAmount: 28500000,
        paymentContent: '1x Dell Latitude 5540',
        contractRef: 'BG-FPT-2026-088',
        participants: [
          { userId: employee.id, role: ParticipantRole.EXECUTOR },
        ],
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.APPROVED,
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.APPROVED,
          },
        ],
        daysAgo: 20,
      },
      {
        code: 'DX-SEED-0007',
        title: 'Quyết toán công tác phí HCM - tháng 5',
        status: ProposalStatus.REJECTED,
        typeCode: 'finance_de_nghi_quyet_toan_cong_tac_phi',
        creatorId: employee.id,
        departmentId: dept.id,
        paymentAmount: 22000000,
        paymentContent: 'Quyết toán vé máy bay + khách sạn',
        currentStepOrder: 1,
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.REJECTED,
            comment: 'Thiếu hóa đơn khách sạn ngày 15/5, bổ sung và gửi lại.',
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.PENDING,
          },
        ],
        daysAgo: 8,
      },
      {
        code: 'DX-SEED-0008',
        title: 'Thanh toán chi phí đào tạo nội bộ ISO',
        status: ProposalStatus.REJECTED,
        typeCode: 'finance_de_nghi_thanh_toan_chi_phi_dao_tao',
        creatorId: employee.id,
        departmentId: dept.id,
        paymentAmount: 45000000,
        paymentContent: 'Khóa đào tạo ISO 9001',
        currentStepOrder: 2,
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.APPROVED,
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.REJECTED,
            comment: 'Vượt ngân sách đào tạo Q2, cần điều chỉnh phương án.',
          },
        ],
        daysAgo: 15,
      },
      {
        code: 'DX-SEED-0009',
        title: 'Thanh toán tiếp khách đối tác Nhật Bản',
        status: ProposalStatus.CANCELLED,
        typeCode: 'finance_de_nghi_thanh_toan_chi_phi_tiep_khach',
        creatorId: employee.id,
        departmentId: dept.id,
        paymentAmount: 12000000,
        paymentContent: 'Tiệc tối tại khách sạn Melia',
        daysAgo: 6,
      },
      {
        code: 'DX-SEED-0010',
        title: 'Thanh toán vận chuyển hàng về kho Bình Dương',
        status: ProposalStatus.PENDING,
        typeCode: 'finance_de_nghi_thanh_toan_chi_phi_van_chuyen',
        creatorId: employee.id,
        departmentId: dept.id,
        projectName: 'Nhập kho thiết bị',
        paymentAmount: 6800000,
        paymentContent: 'Cước vận chuyển Viettel Post',
        currentStepOrder: 1,
        participants: [
          { userId: admin.id, role: ParticipantRole.WATCHER },
          { userId: financeUser.id, role: ParticipantRole.NOTIFY },
          { userId: approver.id, role: ParticipantRole.EXECUTOR },
        ],
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.PENDING,
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.PENDING,
          },
        ],
        daysAgo: 1,
      },
      {
        code: 'DX-SEED-0011',
        title: 'Thanh toán thưởng KPI tháng 5/2026',
        status: ProposalStatus.PENDING_PAYMENT,
        typeCode: 'finance_de_nghi_thanh_toan_thuong',
        creatorId: admin.id,
        departmentId: dept.id,
        paymentAmount: 52000000,
        paymentContent: 'Thưởng KPI bộ phận triển khai',
        currentStepOrder: 2,
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.APPROVED,
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.APPROVED,
          },
        ],
        daysAgo: 25,
      },
      {
        code: 'DX-SEED-0012',
        title: 'Thuê dịch vụ bảo trì máy chủ 12 tháng',
        status: ProposalStatus.PENDING,
        typeCode: 'procurement_de_nghi_thue_dich_vu',
        creatorId: admin.id,
        departmentId: dept.id,
        projectName: 'Hạ tầng CNTT',
        paymentAmount: 96000000,
        paymentContent: 'Gói bảo trì FPT Cloud',
        contractRef: 'HĐ-FPT-2026-BT',
        currentStepOrder: 1,
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.PENDING,
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.PENDING,
          },
        ],
        daysAgo: 4,
      },
      {
        code: 'DX-SEED-0013',
        title: 'Hoàn trả chi phí taxi đi làm ngoài giờ',
        status: ProposalStatus.DRAFT,
        typeCode: 'finance_de_nghi_hoan_tra_chi_phi',
        creatorId: employee.id,
        departmentId: dept.id,
        paymentAmount: 450000,
        paymentContent: '3 chuyến taxi OT cuối tháng 5',
        daysAgo: 0,
      },
      {
        code: 'DX-SEED-0014',
        title: 'Thanh toán hợp đồng thi công văn phòng mới',
        status: ProposalStatus.PENDING_PAYMENT,
        typeCode: 'finance_de_nghi_thanh_toan_hop_dong',
        creatorId: admin.id,
        departmentId: dept.id,
        projectName: 'VP SICOM Tầng 8',
        paymentAmount: 850000000,
        paymentContent: 'Đợt 3/5 theo tiến độ thi công',
        contractRef: 'HĐ-TC-2025-112',
        currentStepOrder: 2,
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.APPROVED,
            comment: 'Nghiệm thu đợt 3 đạt yêu cầu.',
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.APPROVED,
            comment: 'Đã đối chiếu hợp đồng và biên bản nghiệm thu.',
          },
        ],
        daysAgo: 30,
      },
      {
        code: 'DX-SEED-0015',
        title: 'Mua sắm vật tư thi công công trình A',
        status: ProposalStatus.PENDING,
        typeCode: 'procurement_de_nghi_mua_sam_vat_tu',
        creatorId: employee.id,
        departmentId: dept.id,
        projectName: 'Công trình A - Long An',
        paymentAmount: 42000000,
        paymentContent: 'Xi măng, sắt thép đợt 1',
        currentStepOrder: 1,
        participants: [
          { userId: admin.id, role: ParticipantRole.NOTIFY },
        ],
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.PENDING,
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.PENDING,
          },
        ],
        daysAgo: 2,
      },
      {
        code: 'DX-SEED-0016',
        title: 'Thanh toán lương ngoài giờ tháng 5',
        status: ProposalStatus.PENDING_PAYMENT,
        typeCode: 'finance_de_nghi_thanh_toan_luong_ngoai_gio',
        creatorId: admin.id,
        departmentId: dept.id,
        paymentAmount: 18750000,
        paymentContent: 'OT bộ phận kỹ thuật',
        currentStepOrder: 2,
        approvalSteps: [
          { stepOrder: 1, approverId: approver.id, status: ApprovalStepStatus.APPROVED },
          { stepOrder: 2, approverId: financeUser.id, status: ApprovalStepStatus.APPROVED },
        ],
        daysAgo: 18,
      },
      {
        code: 'DX-SEED-0017',
        title: 'Ký hợp đồng mua phần mềm kế toán',
        status: ProposalStatus.PENDING,
        typeCode: 'procurement_de_nghi_ky_hop_dong_mua_hang',
        creatorId: employee.id,
        departmentId: dept.id,
        paymentAmount: 156000000,
        paymentContent: 'License MISA SME 50 user',
        contractRef: 'PA-MISA-2026',
        currentStepOrder: 2,
        approvalSteps: [
          {
            stepOrder: 1,
            approverId: approver.id,
            status: ApprovalStepStatus.APPROVED,
            comment: 'Đã thẩm định nhu cầu và báo giá.',
          },
          {
            stepOrder: 2,
            approverId: financeUser.id,
            status: ApprovalStepStatus.PENDING,
          },
        ],
        daysAgo: 7,
      },
      {
        code: 'DX-SEED-0018',
        title: 'Điều chỉnh ngân sách marketing Q3',
        status: ProposalStatus.DRAFT,
        typeCode: 'finance_de_nghi_dieu_chinh_ngan_sach',
        creatorId: admin.id,
        departmentId: dept.id,
        content: 'Tăng 15% ngân sách digital ads cho chiến dịch mới.',
        daysAgo: 1,
      },
    ],
    workflowByTypeCode,
  );

  console.log('Seed OK. Admin:', admin.email, '/ Admin@123');
  console.log('Sample proposals: DX-SEED-0001 → DX-SEED-0018');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
