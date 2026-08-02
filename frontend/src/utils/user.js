export function getUserDisplayName(user){if(!user)return '';return [user.first_name,user.last_name].filter(Boolean).join(' ')||user.full_name||user.email||'User'}
