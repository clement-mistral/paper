import Icon, { type IconProps } from '~/components/icons/icon'

export default function VehicleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 16v-3l2-5a2 2 0 0 1 1.9-1.3h8.2A2 2 0 0 1 18 8l2 5v3a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0h-4a2 2 0 0 1-4 0H5a1 1 0 0 1-1-1z" />
      <path d="M4 13h16" />
    </Icon>
  )
}
