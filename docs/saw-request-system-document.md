# Tài liệu chi tiết hệ thống SAW Request

Ngày cập nhật: 16/07/2026  
Phạm vi: tài liệu nghiệp vụ và kỹ thuật cho hệ thống `SAW - REQUESTS` trong repository `FINANCE_AUTOMATION`.

## 1. Tổng quan

`SAW - REQUESTS` là hệ thống quản lý đề xuất, phê duyệt và theo dõi thanh toán tài chính nội bộ. Hệ thống giúp số hóa quy trình từ lúc nhân viên tạo đề xuất, gửi phê duyệt, người duyệt xử lý, kế toán hoặc người thực hiện xác nhận thanh toán, đến khi quản trị viên theo dõi báo cáo theo kỳ.

Trọng tâm của hệ thống là module `Đề xuất`, dùng cho các nghiệp vụ như đề nghị thanh toán, tạm ứng, hoàn ứng, quyết toán công tác phí, thanh toán hợp đồng, mua sắm vật tư, mua thiết bị, thuê dịch vụ và các khoản chi phí cần đi qua quy trình xét duyệt.

Hệ thống hiện gồm:

| Nhóm chức năng | Mục đích |
| --- | --- |
| Tổng quan | Xem số liệu nhanh theo tuần hoặc tháng, danh sách đề xuất gần đây và các đề xuất cần duyệt. |
| Đề xuất | Tạo, lưu nháp, gửi duyệt, theo dõi, phê duyệt, từ chối, hủy, nhân bản, xác nhận thanh toán và xuất Excel. |
| Báo cáo | Báo cáo đề xuất và chi phí theo phòng ban/dự án, kỳ tuần hoặc tháng. |
| Nhân viên | Quản lý tài khoản người dùng, vai trò và phòng ban được gán. |
| Phòng ban/Dự án | Quản lý danh mục đơn vị dùng để gắn vào đề xuất. |
| Chức vụ | Quản lý vai trò và bộ quyền. |
| Loại đề xuất | Quản lý danh mục loại đề xuất theo nhóm tài chính hoặc mua sắm. |
| Cài đặt quy trình | Cấu hình workflow phê duyệt, người duyệt, người theo dõi, người nhận thông báo và người thực hiện. |
| Thông báo | Gửi thông báo tự động theo vòng đời đề xuất và nhắc việc quá hạn. |

## 2. Mục tiêu nghiệp vụ

SAW Request được thiết kế để giải quyết các vấn đề thường gặp khi xử lý đề xuất thủ công qua email, chat hoặc file rời:

| Mục tiêu | Diễn giải |
| --- | --- |
| Chuẩn hóa quy trình | Mọi loại đề xuất đi theo workflow đã cấu hình, có bước duyệt rõ ràng. |
| Tập trung hồ sơ | Thông tin đề xuất, chứng từ, hóa đơn, hợp đồng và trạng thái nằm chung một nơi. |
| Minh bạch trách nhiệm | Biết rõ ai tạo, ai duyệt, ai theo dõi, ai nhận thông báo và ai thực hiện thanh toán. |
| Theo dõi tiến độ | Dashboard, danh sách, tab vai trò, filter và timeline giúp nắm nhanh việc đang ở bước nào. |
| Kiểm soát thanh toán | Đề xuất sau khi được duyệt chuyển sang chờ thanh toán và chỉ người thực hiện được xác nhận đã thanh toán. |
| Hỗ trợ báo cáo | Có báo cáo tổng hợp theo kỳ, phòng ban/dự án, trạng thái và chi phí đã chi. |

## 3. Thuật ngữ chính

| Thuật ngữ | Ý nghĩa trong hệ thống |
| --- | --- |
| Đề xuất | Hồ sơ yêu cầu thanh toán, mua sắm hoặc nghiệp vụ tài chính cần phê duyệt. |
| Loại đề xuất | Danh mục phân loại đề xuất, ví dụ `Đề nghị thanh toán`, `Đề nghị tạm ứng`, `Đề nghị mua sắm thiết bị`. |
| Nhóm đề xuất | `FINANCE` cho tài chính - kế toán, `PROCUREMENT` cho mua sắm. |
| Workflow | Quy trình phê duyệt được gắn với một loại đề xuất. |
| Bước duyệt | Một cấp duyệt trong workflow, có thứ tự, nhãn và người duyệt. |
| Người duyệt cấp cao | Bước duyệt đặc biệt có thể duyệt nhanh và bỏ qua các bước còn lại nếu được cấu hình. |
| Người theo dõi | Người có quyền xem/được đưa vào danh sách liên quan của đề xuất. |
| Người nhận thông báo | Người được gắn để nhận thông tin liên quan đến đề xuất. |
| Người thực hiện | Người xử lý sau phê duyệt, thường là kế toán hoặc người phụ trách thanh toán. |
| Phòng ban/Dự án | Đơn vị nội bộ được gắn với người dùng và đề xuất. Trong code là `Department`. |

## 4. Vai trò người dùng

| Vai trò nghiệp vụ | Việc có thể làm |
| --- | --- |
| Nhân viên/người đề xuất | Tạo đề xuất, lưu nháp, gửi duyệt, chỉnh sửa khi còn hợp lệ, hủy, xóa nháp, nhân bản đề xuất. |
| Người duyệt | Xem các đề xuất đang chờ mình xử lý, phê duyệt hoặc từ chối kèm lý do. |
| Người duyệt cấp cao | Có thể duyệt nhanh, bỏ qua các bước duyệt còn lại trong workflow tuần tự. |
| Người theo dõi | Theo dõi tiến trình đề xuất nhưng không trực tiếp xử lý bước duyệt. |
| Người nhận thông báo | Nhận thông báo liên quan đến đề xuất theo cấu hình workflow. |
| Người thực hiện/kế toán | Nhận việc sau khi đề xuất được duyệt và xác nhận đã thanh toán. |
| Quản trị viên | Quản lý nhân viên, phòng ban, vai trò, quyền, loại đề xuất, workflow và báo cáo. |

## 5. Phân quyền

Hệ thống dùng danh sách quyền gắn trên vai trò. Frontend dùng quyền để hiển thị menu/chức năng, backend kiểm tra quyền ở các nghiệp vụ chính như tạo và phê duyệt đề xuất.

| Quyền | Ý nghĩa |
| --- | --- |
| `dashboard.view` | Được vào trang Tổng quan. |
| `proposal.view` | Được mở danh sách và chi tiết đề xuất. |
| `proposal.create` | Được tạo mới, lưu nháp, gửi duyệt và nhân bản đề xuất. |
| `proposal.approve` | Được duyệt hoặc từ chối đề xuất khi nằm trong luồng duyệt. |
| `proposal.pay` | Quyền nghiệp vụ cho nhóm thanh toán. Thao tác xác nhận thanh toán thực tế còn yêu cầu người dùng được gán vai trò `EXECUTOR` trong đề xuất. |
| `report.view` | Được mở báo cáo và thống kê. |
| `department.manage` | Được quản lý phòng ban/dự án. |
| `user.manage` | Được quản lý nhân viên. |
| `role.manage` | Được quản lý vai trò và phân quyền. |
| `proposal_type.manage` | Được quản lý loại đề xuất. |
| `workflow.manage` | Được quản lý workflow phê duyệt. |

Vai trò mặc định trong seed:

| Mã vai trò | Tên | Quyền điển hình |
| --- | --- | --- |
| `ADMIN` | Quản trị viên | Toàn bộ quyền. |
| `MANAGER` | Quản lý | Xem dashboard, đề xuất, tạo, duyệt, thanh toán, báo cáo. |
| `FINANCE` | Kế toán | Xem dashboard, đề xuất, tạo, duyệt, báo cáo. |
| `EMPLOYEE` | Nhân viên | Xem dashboard, đề xuất, tạo đề xuất. |

## 6. Module Tổng quan

Trang Tổng quan giúp người dùng nhìn nhanh tình trạng đề xuất trong kỳ đang chọn.

Chức năng chính:

| Thành phần | Nội dung |
| --- | --- |
| Bộ chọn kỳ | Chọn thống kê theo tuần hoặc theo tháng. |
| Chỉ số nhanh | Chờ duyệt, đã duyệt, tôi cần duyệt, tổng tiền đã duyệt trong kỳ. |
| Tôi cần duyệt | Danh sách đề xuất đang chờ người dùng hiện tại xử lý. |
| Đề xuất gần đây | Các đề xuất mới nhất, không bao gồm nháp và đã hủy. |

Kỳ thống kê:

| Kỳ | Cách tính |
| --- | --- |
| Tuần | Tính từ thứ Hai đến hết Chủ nhật của tuần chứa ngày được chọn. |
| Tháng | Tính từ ngày đầu tháng đến trước ngày đầu tháng kế tiếp. |

Các số liệu được lấy từ các endpoint `/api/admin/dashboard`, `/api/admin/recent-proposals` và `/api/admin/pending-approvals`.

## 7. Module Đề xuất

Module Đề xuất là phần trung tâm của SAW Request.

### 7.1 Danh sách đề xuất

Trang danh sách hiển thị:

| Khu vực | Nội dung |
| --- | --- |
| Thẻ thống kê | Tôi đề xuất, đang chờ duyệt, chờ thanh toán, đã thanh toán, đã từ chối, tôi cần duyệt. |
| Tab vai trò | Tất cả đề xuất, Tôi đề xuất, Tôi phê duyệt, Tôi theo dõi, Tôi nhận thông báo, Tôi thực hiện, Nháp, Đã hủy. |
| Tìm kiếm | Tìm theo tên đề xuất hoặc mã đề xuất. |
| Bộ lọc nâng cao | Trạng thái, loại đề xuất, phòng ban, người tạo, người thực hiện, từ ngày, đến ngày, tiền từ, tiền đến. |
| Bảng dữ liệu | Người đề xuất, phòng ban, tên, mã, loại, ngày tạo, số tiền, trạng thái. |
| Xuất Excel | Xuất file gồm 3 sheet: Tổng quan, Chi tiết đề xuất, Chi phí phòng ban. |

Các view filter đang dùng:

| View | Ý nghĩa |
| --- | --- |
| `all` | Tất cả đề xuất, trừ nháp và đã hủy. |
| `mine` | Đề xuất do người dùng hiện tại tạo. |
| `approve` | Đề xuất đang chờ người dùng hiện tại duyệt. |
| `watch` | Đề xuất người dùng hiện tại được gán theo dõi. |
| `notify` | Đề xuất người dùng hiện tại được gán nhận thông báo. |
| `execute` | Đề xuất người dùng hiện tại được gán thực hiện. |
| `draft` | Nháp của người dùng hiện tại. |
| `cancelled` | Đề xuất đã hủy của người dùng hiện tại. |

### 7.2 Tạo đề xuất

Người dùng cần có quyền `proposal.create` và phải được gán ít nhất một phòng ban/dự án.

Thông tin nhập trên form:

| Nhóm thông tin | Trường dữ liệu |
| --- | --- |
| Thông tin đề xuất | Loại đề xuất, phòng ban, tên đề xuất. |
| Thời hạn duyệt | Thời hạn mong muốn, thời hạn theo quy định. |
| Thông tin thanh toán | Nội dung thanh toán, số tiền, tên chủ tài khoản, ngân hàng/chi nhánh, số tài khoản. |
| Hồ sơ thanh toán | Hợp đồng/báo giá, hóa đơn tài chính. |
| Nội dung và tài liệu | Nội dung mô tả, tài liệu nội dung đính kèm. |

Trường bắt buộc:

| Thời điểm | Trường bắt buộc |
| --- | --- |
| Lưu nháp | Loại đề xuất, phòng ban, tên đề xuất. |
| Gửi duyệt | Loại đề xuất, phòng ban, tên đề xuất, nội dung thanh toán, số tiền thanh toán lớn hơn 0, tên chủ tài khoản, ngân hàng/chi nhánh, số tài khoản, nội dung mô tả. |

Quy tắc tạo:

| Quy tắc | Mô tả |
| --- | --- |
| Tên đề xuất | Bắt buộc nhập. |
| Phòng ban | Bắt buộc. Nếu người dùng chỉ có một phòng ban thì hệ thống tự chọn. Nếu có nhiều phòng ban thì phải chọn. |
| Quyền tạo | Backend kiểm tra `proposal.create`. |
| Mã đề xuất | Tự sinh theo dạng `DX-{năm}-{số thứ tự 4 chữ số}`, ví dụ `DX-2026-0001`. |
| Lưu nháp | `saveAsDraft = true`, trạng thái là `DRAFT`. |
| Gửi duyệt | `saveAsDraft = false`, trạng thái chuyển sang `PENDING`. |
| Workflow | Hệ thống lấy workflow đang hoạt động theo loại đề xuất. |

### 7.3 File đính kèm

Nhóm file:

| Kind | Ý nghĩa |
| --- | --- |
| `CONTRACT` | Hợp đồng hoặc báo giá. |
| `INVOICE` | Hóa đơn tài chính. |
| `CONTENT` | Tài liệu nội dung, chứng từ hoặc file mô tả bổ sung. |

Quy tắc file:

| Thuộc tính | Giá trị |
| --- | --- |
| Dung lượng tối đa | 15 MB mỗi file. |
| Loại file hỗ trợ | PDF, JPEG, PNG, WEBP, GIF, Word, Excel. |
| Lưu trữ | Backend lưu file vào `{UPLOAD_DIR}/proposals`, mặc định `uploads/proposals`. |
| URL truy cập | `{UPLOAD_URL_PREFIX}/proposals/{storedName}`, mặc định `/api/uploads/proposals/{storedName}`. |
| Preview | Ảnh hiển thị trực tiếp, PDF qua iframe, Excel đọc và render sheet, Word tải/mở ngoài. |

### 7.4 Chi tiết đề xuất

Trang chi tiết hiển thị toàn bộ hồ sơ:

| Khu vực | Nội dung |
| --- | --- |
| Header | Tên đề xuất, mã, loại đề xuất, tên workflow và trạng thái. |
| Thông tin chung | Người đề xuất, phòng ban, dự án, ngày tạo, hạn mong muốn, hạn theo quy định. |
| Nội dung mô tả | Nội dung đề xuất dạng văn bản. |
| Lý do hủy | Hiển thị nếu đề xuất ở trạng thái `CANCELLED`. |
| Thông tin thanh toán | Số tiền, nội dung thanh toán, chủ tài khoản, ngân hàng, số tài khoản. |
| File đính kèm | Danh sách và preview tài liệu. |
| Người liên quan | Người theo dõi, người nhận thông báo, người thực hiện. |
| Ghi chú duyệt | Ô nhập ghi chú cho người duyệt hiện tại. |
| Timeline duyệt | Các bước duyệt, người duyệt, trạng thái, ghi chú và tiến độ. |

Thao tác trên trang chi tiết:

| Thao tác | Điều kiện |
| --- | --- |
| Phê duyệt | Người dùng là approver hiện tại hoặc approver cấp cao, đề xuất đang `PENDING`. |
| Từ chối | Người dùng là approver hợp lệ, bắt buộc nhập lý do. |
| Gửi duyệt | Người tạo, đề xuất đang `DRAFT`. |
| Đã thanh toán | Người dùng là `EXECUTOR`, đề xuất đang `PENDING_PAYMENT` hoặc `APPROVED`. |
| Chỉnh sửa | Người tạo, đề xuất đang `DRAFT` hoặc `PENDING`. |
| Nhân bản | Người dùng có quyền `proposal.create` và có quyền xem đề xuất nguồn. |
| Hủy đề xuất | Người tạo, đề xuất đang `DRAFT` hoặc `PENDING`, bắt buộc nhập lý do. |
| Xóa nháp | Người tạo, đề xuất đang `DRAFT`. |

### 7.5 Chỉnh sửa đề xuất

Người tạo được chỉnh sửa đề xuất khi trạng thái là `DRAFT` hoặc `PENDING`.

Với đề xuất nháp:

| Nút | Kết quả |
| --- | --- |
| Lưu nháp | Cập nhật thông tin và giữ trạng thái `DRAFT`. |
| Lưu & gửi duyệt | Cập nhật thông tin, sau đó submit sang workflow. |

Với đề xuất đang chờ duyệt:

| Nút | Kết quả |
| --- | --- |
| Lưu thay đổi | Cập nhật thông tin nhưng vẫn ở trạng thái `PENDING`. |

### 7.6 Nhân bản đề xuất

Khi nhân bản:

| Quy tắc | Mô tả |
| --- | --- |
| Trạng thái mới | Luôn là `DRAFT`. |
| Người tạo | Là người đang nhân bản. |
| Mã đề xuất | Sinh mã mới. |
| Nội dung | Sao chép dữ liệu chính và thêm ghi chú nhân bản từ mã cũ. |
| Workflow/participant | Nếu đề xuất nguồn có workflow, lấy participant từ workflow; nếu không có workflow, sao chép participant từ đề xuất nguồn. |
| Liên kết nguồn | Lưu `linkedProposalId` trỏ về đề xuất gốc. |

## 8. Vòng đời trạng thái đề xuất

Trạng thái trong hệ thống:

| Trạng thái | Ý nghĩa |
| --- | --- |
| `DRAFT` | Bản nháp, chưa gửi duyệt. Người tạo có thể sửa, gửi duyệt hoặc xóa. |
| `PENDING` | Đã gửi duyệt và đang chờ approver xử lý. |
| `APPROVED` | Trạng thái enum còn tồn tại để tương thích. Luồng hiện tại thường chuyển thẳng sang `PENDING_PAYMENT` sau khi duyệt xong. |
| `PENDING_PAYMENT` | Đã qua phê duyệt, đang chờ người thực hiện/kế toán xác nhận thanh toán. |
| `PAID` | Đã được xác nhận thanh toán. |
| `REJECTED` | Bị từ chối trong quá trình phê duyệt. |
| `CANCELLED` | Bị người tạo hủy khi còn hợp lệ để hủy. |

Luồng chính:

```text
DRAFT
  | gửi duyệt
  v
PENDING
  | tất cả bước duyệt hoàn tất
  v
PENDING_PAYMENT
  | người thực hiện xác nhận
  v
PAID

PENDING -> REJECTED
DRAFT/PENDING -> CANCELLED
DRAFT -> deleted
```

## 9. Quy trình phê duyệt

Workflow được cấu hình theo từng loại đề xuất. Một workflow gồm:

| Thành phần | Mô tả |
| --- | --- |
| Tên quy trình | Tên dễ nhận biết trên màn hình cài đặt và chi tiết đề xuất. |
| Loại đề xuất | Workflow gắn với một loại đề xuất cụ thể. |
| Chế độ duyệt | Tuần tự hoặc song song. |
| Bước duyệt | Danh sách người duyệt theo `stepOrder`. |
| Người duyệt cấp cao | Bước có `isSeniorApprover = true`. |
| Người liên quan | Watcher, Notify, Executor. |
| Trạng thái workflow | Đang hoạt động hoặc tạm tắt. |

### 9.1 Duyệt tuần tự

Trong workflow tuần tự:

| Quy tắc | Mô tả |
| --- | --- |
| Bước hiện tại | Lưu trong `currentStepOrder`. |
| Người được duyệt | Approver của bước hiện tại được duyệt. |
| Cấp cao | Approver cấp cao có thể duyệt dù chưa đến lượt. |
| Sau khi duyệt | Nếu còn bước tiếp theo, chuyển `currentStepOrder` sang bước đó. |
| Hoàn tất | Nếu không còn bước tiếp theo, chuyển đề xuất sang `PENDING_PAYMENT`. |

### 9.2 Duyệt song song

Trong workflow song song:

| Quy tắc | Mô tả |
| --- | --- |
| Người được duyệt | Tất cả approver đang `PENDING` đều có thể duyệt. |
| Hoàn tất | Chỉ chuyển sang `PENDING_PAYMENT` khi không còn bước duyệt nào ở trạng thái `PENDING`. |

### 9.3 Duyệt cấp cao

Người duyệt cấp cao có quyền duyệt nhanh:

| Hành vi | Kết quả |
| --- | --- |
| Approver cấp cao duyệt | Bước của người đó thành `APPROVED`. |
| Các bước còn pending | Chuyển thành `SKIPPED`. |
| Đề xuất | Chuyển sang `PENDING_PAYMENT`. |

### 9.4 Từ chối

Khi từ chối:

| Quy tắc | Mô tả |
| --- | --- |
| Lý do | Bắt buộc nhập. |
| Người từ chối | Phải có quyền `proposal.approve` và nằm trong bước duyệt hợp lệ. |
| Workflow tuần tự | Nếu không phải cấp cao thì chỉ được từ chối khi đúng lượt. |
| Kết quả | Bước duyệt thành `REJECTED`, đề xuất thành `REJECTED`. |
| Thông báo | Thông báo action/task liên quan được đánh dấu đã đọc, creator nhận thông báo bị từ chối. |

## 10. Thanh toán sau phê duyệt

Sau khi đề xuất được duyệt xong:

| Bước | Mô tả |
| --- | --- |
| Chuyển trạng thái | Đề xuất chuyển sang `PENDING_PAYMENT`. |
| Ghi nhận nhắc việc | `lastReminderSentAt` được cập nhật để kiểm soát reminder. |
| Thông báo creator | Creator nhận thông báo đề xuất đã được duyệt và đang chờ thanh toán. |
| Thông báo executor | Người thực hiện nhận task nhắc thanh toán. |
| Xác nhận thanh toán | Chỉ người được gán `EXECUTOR` trong proposal participant được bấm `Đã thanh toán`. |
| Hoàn tất | Đề xuất chuyển sang `PAID`, creator nhận thông báo đã thanh toán. |

Lưu ý: quyền `proposal.pay` là quyền nghiệp vụ trên vai trò, nhưng điều kiện hiển thị/thực thi xác nhận thanh toán hiện dựa trực tiếp vào việc user có nằm trong participant `EXECUTOR` hay không.

## 11. Thông báo

Hệ thống có model `Notification` và module API riêng.

Loại thông báo:

| Type | Ý nghĩa |
| --- | --- |
| `INFO` | Thông tin chung, ví dụ đề xuất đã gửi, đã duyệt, đã từ chối, đã thanh toán. |
| `WARNING` | Cảnh báo. Hiện có enum để mở rộng. |
| `ACTION` | Việc cần hành động, thường là yêu cầu duyệt. |
| `TASK` | Việc cần thực hiện, thường là nhắc thanh toán. |

Trigger tự động:

| Sự kiện | Người nhận |
| --- | --- |
| Submit đề xuất | Approver ban đầu và creator. |
| Duyệt sang bước tiếp theo | Approver bước kế tiếp. |
| Duyệt hoàn tất | Creator và executor. |
| Từ chối | Creator. |
| Xác nhận đã thanh toán | Creator. |
| Hủy đề xuất | Các action/task liên quan được đánh dấu đã đọc. |

Reminder tự động:

| Job | Quy tắc |
| --- | --- |
| Nhắc duyệt | Chạy mỗi 10 phút, tìm đề xuất `PENDING` quá 24 giờ và gửi cho approver hiện tại. |
| Nhắc thanh toán | Chạy mỗi 10 phút, tìm đề xuất `PENDING_PAYMENT` quá 24 giờ và gửi cho executor. |
| Chống trùng | Dùng `lastReminderSentAt` để tránh gửi reminder liên tục. |

API cũng lọc các thông báo action/task đã stale. Ví dụ nếu user không còn là approver hiện tại, thông báo action cũ sẽ được ẩn và đánh dấu đã đọc bất đồng bộ.

## 12. Báo cáo và xuất dữ liệu

### 12.1 Báo cáo phòng ban/dự án

Trang Báo cáo hỗ trợ:

| Bộ lọc | Mô tả |
| --- | --- |
| Phòng ban | Chọn một phòng ban/dự án hoặc tất cả. |
| Kỳ báo cáo | Theo tuần hoặc theo tháng. |
| Ngày/tháng | Ngày neo tuần hoặc tháng cần xem. |

Chỉ số:

| Chỉ số | Mô tả |
| --- | --- |
| Tổng đề xuất | Số đề xuất trong kỳ, không tính nháp và đã hủy. |
| Chờ duyệt | Số đề xuất `PENDING`. |
| Đã duyệt | Số đề xuất thuộc nhóm đã duyệt, gồm `APPROVED`, `PENDING_PAYMENT`, `PAID`. |
| Chờ thanh toán | Số đề xuất `PENDING_PAYMENT`. |
| Tổng đã duyệt | Tổng tiền của nhóm đã duyệt. |
| Tổng chi phí đã chi | Tổng tiền của các đề xuất `PAID`. |

Báo cáo có biểu đồ chi phí đã chi theo 12 tháng của năm đang xem và bảng danh sách đề xuất trong kỳ.

### 12.2 Xuất Excel từ danh sách đề xuất

Từ màn hình Đề xuất, người dùng có thể xuất Excel theo bộ lọc hiện tại hoặc bộ lọc riêng trong modal xuất file.

File gồm 3 sheet:

| Sheet | Nội dung |
| --- | --- |
| `Tong quan` | Điều kiện lọc, tổng số đề xuất, số lượng theo trạng thái, tổng tiền, thời điểm xuất. |
| `Chi tiet de xuat` | Danh sách từng đề xuất: mã, tên, creator, email, executor, phòng ban, loại, ngày, số tiền, trạng thái, lý do từ chối/hủy. |
| `Chi phi phong ban` | Tổng hợp số lượng và chi phí theo từng phòng ban. |

## 13. Quản trị danh mục

### 13.1 Loại đề xuất

Loại đề xuất được chia theo 2 nhóm:

| Nhóm | Ý nghĩa |
| --- | --- |
| `FINANCE` | Tài chính - kế toán: thanh toán, tạm ứng, hoàn ứng, quyết toán, ngân sách, công nợ. |
| `PROCUREMENT` | Mua sắm: vật tư, thiết bị, văn phòng phẩm, dịch vụ, hợp đồng mua hàng. |

Thông tin quản lý:

| Trường | Mô tả |
| --- | --- |
| `code` | Mã loại đề xuất, unique. UI có thể tự sinh từ tên và nhóm. |
| `name` | Tên hiển thị. |
| `group` | Nhóm tài chính hoặc mua sắm. |
| `isActive` | Bật/tắt sử dụng khi tạo đề xuất. |
| `sortOrder` | Thứ tự hiển thị. |

### 13.2 Workflow

Trang Cài đặt quy trình hỗ trợ:

| Chức năng | Mô tả |
| --- | --- |
| Danh sách workflow | Xem tên, loại đề xuất, trạng thái hoạt động, kiểu duyệt và người liên quan. |
| Tìm kiếm | Theo tên quy trình, loại đề xuất, người duyệt hoặc participant. |
| Lọc | Theo loại đề xuất và trạng thái active/inactive. |
| Thêm quy trình | Tạo workflow mới cho một loại đề xuất. |
| Sửa nhanh | Cập nhật tên, kiểu duyệt, active, người duyệt và participant. |
| Chỉnh nhanh hàng loạt | Áp dụng thay đổi approver/watcher/notify/executor cho nhiều workflow. |

Form workflow:

| Trường | Quy tắc |
| --- | --- |
| Tên quy trình | Bắt buộc. |
| Loại đề xuất | Bắt buộc khi tạo, không sửa khi edit nhanh. |
| Duyệt tuần tự | Checkbox, mặc định bật. |
| Đang hoạt động | Chỉ hiển thị khi edit. |
| Người duyệt cấp 1 | Bắt buộc. |
| Người duyệt cấp cao | Tùy chọn, được đánh dấu `isSeniorApprover`. |
| Người theo dõi | Tùy chọn nhiều người. |
| Người nhận thông báo | Tùy chọn nhiều người. |
| Người thực hiện | Tùy chọn nhiều người, dùng cho bước thanh toán sau duyệt. |

### 13.3 Nhân viên

Quản lý người dùng gồm:

| Trường | Mô tả |
| --- | --- |
| Email | Unique, dùng để đăng nhập. |
| Mật khẩu | Được hash bằng bcrypt. |
| Họ tên | Tên hiển thị. |
| Vai trò | Liên kết tới `Role`. |
| Phòng ban | Có thể gán một hoặc nhiều phòng ban qua `UserDepartment`. |
| Trạng thái | Active/inactive. |

Backend loại bỏ `passwordHash` trước khi trả dữ liệu ra API.

### 13.4 Vai trò

Vai trò quản lý:

| Trường | Mô tả |
| --- | --- |
| `code` | Mã vai trò, unique. |
| `name` | Tên vai trò. |
| `description` | Mô tả. |
| `permissions` | Danh sách quyền hợp lệ. |
| `isActive` | Trạng thái vai trò. |
| `sortOrder` | Thứ tự hiển thị. |

Khi tắt một vai trò, backend kiểm tra không cho tắt nếu vai trò đang được gán cho nhân viên.

### 13.5 Phòng ban/Dự án

Danh mục phòng ban/dự án gồm:

| Trường | Mô tả |
| --- | --- |
| `name` | Tên phòng ban/dự án, unique. |
| `isActive` | Chỉ phòng ban active được trả trong danh sách chọn. |

Người dùng chỉ được tạo đề xuất vào phòng ban mà mình được gán.

## 14. Mô hình dữ liệu

Các model chính:

| Model | Vai trò |
| --- | --- |
| `Role` | Vai trò và quyền của người dùng. |
| `User` | Tài khoản nhân viên, vai trò, phòng ban, trạng thái. |
| `UserDepartment` | Bảng nhiều-nhiều giữa user và department. |
| `Department` | Phòng ban/dự án. |
| `ProposalType` | Loại đề xuất, nhóm tài chính/mua sắm. |
| `ApprovalWorkflow` | Workflow phê duyệt theo loại đề xuất. |
| `ApprovalWorkflowStep` | Cấu hình bước duyệt trong workflow. |
| `ApprovalWorkflowParticipant` | Cấu hình watcher/notify/executor theo workflow. |
| `Proposal` | Hồ sơ đề xuất thực tế. |
| `ProposalParticipant` | Người liên quan của từng proposal. |
| `ProposalApprovalStep` | Snapshot bước duyệt của từng proposal. |
| `ProposalAttachment` | File đính kèm của proposal. |
| `Notification` | Thông báo của user. |

Quan hệ chính:

| Quan hệ | Mô tả |
| --- | --- |
| User - Role | Mỗi user thuộc một role. |
| User - Department | User có `departmentId` chính và có thể có nhiều department memberships. |
| Proposal - Creator | Mỗi proposal có một creator. |
| Proposal - Department | Proposal thuộc một phòng ban/dự án. |
| Proposal - ProposalType | Proposal thuộc một loại đề xuất. |
| ProposalType - Workflow | Một loại đề xuất có thể có nhiều workflow, hệ thống dùng workflow active. |
| Workflow - Step | Workflow có nhiều bước duyệt. |
| Workflow - Participant | Workflow có watcher/notify/executor mặc định. |
| Proposal - ApprovalStep | Khi submit, proposal nhận snapshot các bước duyệt từ workflow. |
| Proposal - Participant | Khi tạo/submit, proposal nhận participant từ workflow. |
| Proposal - Attachment | Proposal có nhiều file đính kèm. |
| Notification - User | Notification có thể gắn với một user cụ thể. |

## 15. API chính

Backend đặt global prefix là `/api`. Swagger có tại `/api/docs`.

Header định danh người dùng:

```http
X-User-Id: {userId}
```

Frontend hiện lưu user id trong localStorage key `finance_current_user_id` và tự gắn header này qua axios interceptor.

### 15.1 Auth

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Đăng nhập bằng email/mật khẩu, trả về user an toàn không có password hash. |

### 15.2 Dashboard và báo cáo

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Lấy chỉ số tổng quan theo kỳ. |
| `GET` | `/api/admin/recent-proposals` | Lấy đề xuất gần đây theo kỳ. |
| `GET` | `/api/admin/pending-approvals` | Lấy đề xuất user hiện tại cần duyệt. |
| `GET` | `/api/admin/report-departments` | Lấy danh sách phòng ban phục vụ báo cáo. |
| `GET` | `/api/admin/department-report` | Lấy báo cáo theo phòng ban và kỳ. |

Query phổ biến:

| Query | Mô tả |
| --- | --- |
| `period=week/month` | Chọn kỳ tuần hoặc tháng. |
| `date=YYYY-MM-DD` | Ngày neo cho kỳ tuần. |
| `date=YYYY-MM` | Tháng cần xem. |
| `departmentId` | Lọc báo cáo theo phòng ban. |

### 15.3 Đề xuất

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/proposals/stats` | Lấy thống kê proposal theo user hiện tại. |
| `GET` | `/api/proposals` | Lấy danh sách proposal theo view/filter. |
| `POST` | `/api/proposals` | Tạo proposal mới. |
| `GET` | `/api/proposals/projects` | Lấy danh sách projectName đã dùng. |
| `GET` | `/api/proposals/:id` | Xem chi tiết proposal. |
| `PATCH` | `/api/proposals/:id` | Cập nhật proposal. |
| `POST` | `/api/proposals/:id/submit` | Gửi duyệt proposal nháp. |
| `POST` | `/api/proposals/:id/approve` | Phê duyệt proposal. |
| `POST` | `/api/proposals/:id/reject` | Từ chối proposal, bắt buộc có comment. |
| `POST` | `/api/proposals/:id/mark-paid` | Xác nhận proposal đã thanh toán. |
| `POST` | `/api/proposals/:id/duplicate` | Nhân bản proposal thành bản nháp mới. |
| `POST` | `/api/proposals/:id/cancel` | Hủy proposal, bắt buộc có reason. |
| `DELETE` | `/api/proposals/:id` | Xóa proposal nháp. |

Filter danh sách proposal:

| Query | Mô tả |
| --- | --- |
| `view` | `all`, `mine`, `approve`, `watch`, `notify`, `execute`, `draft`, `cancelled`. |
| `status` | Trạng thái proposal. Không áp dụng `DRAFT/CANCELLED` ngoài view riêng. |
| `proposalTypeId` | Lọc theo loại đề xuất. |
| `departmentId` | Lọc theo phòng ban. |
| `creatorId` | Lọc theo người tạo. |
| `executorId` | Lọc theo người thực hiện. |
| `projectName` | Lọc theo tên dự án. |
| `dateFrom`, `dateTo` | Lọc theo ngày tạo. |
| `amountMin`, `amountMax` | Lọc theo số tiền. |
| `search` | Tìm trong title hoặc code. |

### 15.4 File đính kèm đề xuất

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/proposals/:id/attachments` | Lấy danh sách file của proposal. |
| `POST` | `/api/proposals/:id/attachments?kind=CONTRACT` | Upload file theo nhóm. |
| `DELETE` | `/api/proposals/:id/attachments/:attachmentId` | Xóa file đính kèm. |

### 15.5 Loại đề xuất và workflow

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/proposal-types` | Lấy danh sách loại đề xuất. |
| `POST` | `/api/proposal-types` | Tạo loại đề xuất. |
| `PATCH` | `/api/proposal-types/:id` | Cập nhật loại đề xuất. |
| `GET` | `/api/workflows` | Lấy danh sách workflow. |
| `GET` | `/api/workflows/:id` | Xem chi tiết workflow. |
| `POST` | `/api/workflows` | Tạo workflow. |
| `PATCH` | `/api/workflows/:id` | Cập nhật workflow. |

Query `proposal-types`:

| Query | Mô tả |
| --- | --- |
| `group` | Lọc `FINANCE` hoặc `PROCUREMENT`. |
| `includeInactive=true` | Bao gồm loại đã tạm tắt. |
| `includeWorkflows=false` | Không include workflow để payload nhẹ hơn. |

### 15.6 Nhân viên, vai trò, phòng ban

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/users` | Danh sách nhân viên. |
| `GET` | `/api/users/:id` | Chi tiết nhân viên. |
| `POST` | `/api/users` | Tạo nhân viên. |
| `PATCH` | `/api/users/:id` | Cập nhật nhân viên. |
| `GET` | `/api/roles` | Danh sách vai trò. |
| `GET` | `/api/roles/:id` | Chi tiết vai trò. |
| `POST` | `/api/roles` | Tạo vai trò. |
| `PATCH` | `/api/roles/:id` | Cập nhật vai trò. |
| `GET` | `/api/departments` | Danh sách phòng ban active. |
| `POST` | `/api/departments` | Tạo phòng ban. |
| `PATCH` | `/api/departments/:id` | Cập nhật phòng ban. |

### 15.7 Thông báo

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/notifications` | Lấy thông báo của user hiện tại. |
| `POST` | `/api/notifications` | Tạo notification. |
| `POST` | `/api/notifications/:id/read` | Đánh dấu một thông báo đã đọc. |
| `POST` | `/api/notifications/mark-all-read` | Đánh dấu tất cả đã đọc. |

Query:

| Query | Mô tả |
| --- | --- |
| `unread=1` | Chỉ lấy thông báo chưa đọc. |
| `type` | Lọc theo notification type. |

## 16. Kiến trúc kỹ thuật

### 16.1 Frontend

| Thành phần | Công nghệ |
| --- | --- |
| Framework | Next.js 16, React 19, TypeScript. |
| Styling | Tailwind CSS 4, utility CSS nội bộ. |
| API client | Axios, base URL mặc định `http://localhost:4001/api`. |
| Icon | `lucide-react`. |
| Toast | `sonner`. |
| Excel | `xlsx` để preview và export. |
| User context | React context lưu current user và cache users trong localStorage. |

Các route chính:

| Route | Màn hình |
| --- | --- |
| `/login` | Đăng nhập. |
| `/dashboard` | Tổng quan. |
| `/proposals` | Danh sách đề xuất. |
| `/proposals/new` | Tạo đề xuất. |
| `/proposals/:id` | Chi tiết đề xuất. |
| `/proposals/:id/edit` | Chỉnh sửa đề xuất. |
| `/reports` | Báo cáo. |
| `/employees` | Nhân viên. |
| `/departments` | Phòng ban/dự án. |
| `/roles` | Chức vụ/vai trò. |
| `/proposal-types` | Loại đề xuất. |
| `/settings` | Cài đặt quy trình phê duyệt. |

### 16.2 Backend

| Thành phần | Công nghệ |
| --- | --- |
| Framework | NestJS 11, TypeScript. |
| ORM | Prisma 7. |
| Database | PostgreSQL. |
| Validation | `class-validator`, `class-transformer`, `ValidationPipe` whitelist + transform. |
| API docs | Swagger tại `/api/docs`. |
| Auth hiện tại | Login bằng bcrypt, request context qua header `X-User-Id`. |
| File upload | Multer interceptor, lưu local disk. |
| Scheduler | `NotificationsScheduler` chạy interval nội bộ mỗi 10 phút. |

### 16.3 Cấu hình runtime

Backend đọc cấu hình từ `backend/.env`, mẫu nằm ở `backend/.env.example`.

| Biến backend | Mục đích |
| --- | --- |
| `NODE_ENV` | Môi trường chạy, ví dụ `development` hoặc `production`. |
| `APP_NAME` | Tên hiển thị trong Swagger. |
| `HOST` | Host bind server, VPS thường dùng `0.0.0.0`. |
| `PORT` | Cổng backend, mặc định `4001`. |
| `API_PREFIX` | Prefix API, mặc định `api`. |
| `CORS_ORIGIN` | Origin frontend được phép gọi API. Có thể nhập nhiều domain, ngăn cách bằng dấu phẩy. |
| `CORS_CREDENTIALS` | Bật/tắt credentials cho CORS, mặc định `true`. |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL cho Prisma. |
| `UPLOAD_DIR` | Thư mục lưu file upload, mặc định `uploads`. |
| `UPLOAD_URL_PREFIX` | Prefix public để truy cập file upload, mặc định `/api/uploads/`. |
| `MAX_UPLOAD_FILE_SIZE_MB` | Dung lượng tối đa mỗi file upload, mặc định `15`. |
| `SWAGGER_ENABLED` | Bật/tắt Swagger. |
| `SWAGGER_PATH` | Đường dẫn Swagger, mặc định `api/docs`. |
| `BCRYPT_SALT_ROUNDS` | Số vòng hash mật khẩu bằng bcrypt, mặc định `10`. |

Frontend đọc cấu hình từ `frontend/.env.local`, mẫu nằm ở `frontend/.env.local.example`.

| Biến frontend | Mục đích |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL frontend dùng để gọi API, ví dụ `https://api.example.com/api`. |
| `NEXT_PUBLIC_API_ORIGIN` | Origin dùng để ghép link file upload, ví dụ `https://api.example.com`. Nếu không set, frontend tự suy từ `NEXT_PUBLIC_API_URL`. |
| `NEXT_PUBLIC_SITE_NAME` | Tên ứng dụng hiển thị trên giao diện. |
| `NEXT_PUBLIC_SITE_SHORT_NAME` | Tên ngắn/lời chào hiển thị. |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Mô tả ứng dụng. |
| `NEXT_PUBLIC_SITE_LOCALE` | Locale giao diện, mặc định `vi`. |

## 17. Luồng demo đề xuất

Kịch bản demo nhanh:

1. Đăng nhập bằng tài khoản có quyền tạo đề xuất.
2. Vào `Đề xuất`, xem thẻ thống kê và danh sách.
3. Chọn `Thêm đề xuất`.
4. Chọn loại đề xuất và phòng ban.
5. Nhập tên, nội dung thanh toán, số tiền, thông tin tài khoản và tải file đính kèm.
6. Chọn `Lưu nháp` để kiểm tra tab `Nháp`.
7. Mở nháp, chọn `Gửi duyệt`.
8. Đăng nhập hoặc chuyển sang user approver.
9. Vào tab `Tôi phê duyệt`, mở đề xuất và phê duyệt hoặc từ chối.
10. Nếu duyệt xong, kiểm tra đề xuất chuyển sang `Chờ thanh toán`.
11. Đăng nhập hoặc chuyển sang user executor.
12. Vào tab `Tôi thực hiện`, mở đề xuất và bấm `Đã thanh toán`.
13. Quay lại dashboard/báo cáo để kiểm tra số liệu cập nhật.

## 18. Quy tắc kiểm soát quan trọng

| Nhóm | Quy tắc cần nhớ |
| --- | --- |
| Tạo đề xuất | User phải có quyền `proposal.create` và thuộc phòng ban được chọn. |
| Gửi duyệt từ nháp | Chỉ creator được gửi, proposal phải ở `DRAFT`, workflow phải có bước duyệt. |
| Chỉnh sửa | Chỉ creator được sửa, chỉ khi `DRAFT` hoặc `PENDING`. |
| Xóa | Chỉ creator được xóa, chỉ xóa được `DRAFT`. |
| Hủy | Chỉ creator được hủy, chỉ hủy được `DRAFT` hoặc `PENDING`, bắt buộc lý do. |
| Duyệt | User phải có `proposal.approve` và là approver hợp lệ. |
| Từ chối | Bắt buộc lý do, proposal chuyển `REJECTED`. |
| Thanh toán | Chỉ `EXECUTOR` của proposal được xác nhận `PAID`. |
| Filter tiền | `amountMin` không được lớn hơn `amountMax`. |
| File | Tối đa 15 MB, chỉ nhận PDF, ảnh, Word, Excel. |

## 19. Lưu ý kỹ thuật trước production

Các điểm hiện tại nên được xem xét nếu đưa hệ thống ra môi trường production:

| Điểm cần lưu ý | Khuyến nghị |
| --- | --- |
| Xác thực | Cơ chế hiện tại dùng `X-User-Id` từ localStorage. Nên thay bằng session/JWT/OAuth hoặc middleware auth thật. |
| Phân quyền API | Một số endpoint quản trị và file attachment cần được bổ sung guard/permission rõ ràng nếu public network. |
| File storage | File đang lưu local disk. Production nên cân nhắc object storage, scan virus và policy xóa file. |
| Audit log | Nên thêm log hành động cho duyệt, từ chối, hủy, xóa, thanh toán. |
| Gửi mail/chat | Notification hiện lưu trong DB. Có thể mở rộng gửi email, Slack, Teams hoặc mobile push. |
| APPROVED status | Enum có `APPROVED`, nhưng luồng duyệt hiện chuyển sang `PENDING_PAYMENT`. Nên thống nhất nếu cần báo cáo riêng trạng thái đã duyệt chưa chờ thanh toán. |
| Workflow trực tiếp khi tạo mới | Submit từ nháp có validate workflow, còn tạo mới với `saveAsDraft=false` nên đảm bảo workflow đã cấu hình trước để tránh proposal pending thiếu step. |

## 20. Tóm tắt

SAW Request là hệ thống quản lý đề xuất tài chính theo workflow, có đủ vòng đời từ tạo hồ sơ, đính kèm chứng từ, phê duyệt, từ chối, hủy, xác nhận thanh toán, đến báo cáo và thông báo. Điểm mạnh của hệ thống là dữ liệu tập trung, phân vai rõ, trạng thái minh bạch và có khả năng mở rộng workflow theo từng loại đề xuất.

Tài liệu này có thể dùng làm:

| Mục đích | Cách dùng |
| --- | --- |
| Onboarding người dùng | Đọc các phần 1 đến 13. |
| Demo sản phẩm | Dùng phần 17. |
| Bàn giao kỹ thuật | Đọc các phần 14 đến 19. |
| Kiểm thử nghiệp vụ | Dùng phần 8, 9, 10 và 18 làm checklist. |
