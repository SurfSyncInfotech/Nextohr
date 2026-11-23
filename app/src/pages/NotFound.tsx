import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="card">
      <EmptyState icon={<Compass className="h-5 w-5" />} title="Page not found" body="The link may be old or mistyped. Use search (Ctrl K) to jump anywhere."
        action={<Link to="/"><Button variant="primary">Go to dashboard</Button></Link>} />
    </div>
  )
}
