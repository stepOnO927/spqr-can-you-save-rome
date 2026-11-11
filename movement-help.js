export function marchReason(reason,language='en'){
 const zh=language==='zh';
 return ({adjacent:zh?'目的地与军队所在战区不相连。':'Cannot move: the destination is not connected.',peace:zh?'无法进入：尚未与目标战区的报告控制方交战，也无通行权。':'Cannot enter: you are not at war with the reported controller and have no access agreement.',transport:zh?'无法跨海行军：海运需要8国库。':'Cannot cross by sea: transport requires 8 treasury.',unavailable:zh?'军队正在行军或围攻，无法下达新行军令。':'This army is marching or besieging and cannot receive a new march order.',reorganizing:zh?'军队正在整编，暂时无法行军。':'This army is reorganizing and cannot march yet.'})[reason]||(zh?'目前无法下达行军令。':'Cannot issue this march order.');
}
