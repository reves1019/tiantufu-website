import { useEffect, useState } from 'react'
import { useContent } from './contentStore'
import { communityError, communityEvent, getCommunityAccess, type Access } from './community'
export function useCommunityAccess() {
  const { account, cloudMode } = useContent()
  const [access, setAccess] = useState<Access>({ canEdit: false, canInteract: false, cloud: cloudMode })
  const [error, setError] = useState('')
  useEffect(() => {
    let current = true
    setAccess({ canEdit: false, canInteract: false, cloud: cloudMode })
    const load = () => { void getCommunityAccess(account).then(a => { if (current) { setAccess(a); setError('') } }).catch(e => { if (current) { setAccess({ canEdit: false, canInteract: false, cloud: cloudMode }); setError(communityError(e)) } }) }
    load(); window.addEventListener(communityEvent, load); window.addEventListener('focus', load)
    const timer = account && cloudMode ? window.setInterval(load, 30000) : undefined
    return () => { current = false; window.removeEventListener(communityEvent, load); window.removeEventListener('focus', load); clearInterval(timer) }
  }, [account, cloudMode])
  return { ...access, error }
}
