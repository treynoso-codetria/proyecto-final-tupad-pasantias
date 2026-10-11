import { Link } from 'react-router'
import { Alert } from './Alert'
import { buttonStyles } from './button-styles'

// In place of a page whose content does not exist or is not visible.
export function NotFoundNotice({
  message,
  backTo,
  backLabel,
}: {
  message: string
  backTo: string
  backLabel: string
}) {
  return (
    <div className="max-w-xl space-y-5">
      <Alert variant="info">{message}</Alert>
      <Link to={backTo} className={buttonStyles('secondary')}>
        {backLabel}
      </Link>
    </div>
  )
}
