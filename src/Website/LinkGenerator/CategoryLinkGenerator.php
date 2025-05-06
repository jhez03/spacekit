<?php

namespace App\Website\LinkGenerator;

use App\Website\Tool\Text;
use Pimcore\Model\DataObject\Category;
use Pimcore\Model\Document;

class CategoryLinkGenerator extends AbstractProductLinkGenerator
{
    public function generate(object $object, array $params = [], bool $reset = false): string
    {
        if (false === $object instanceof Category) {
            throw new \InvalidArgumentException('Given object is no category');
        }
        if (isset($params['document']) && $params['document'] instanceof Document) {
            $this->document = $params['document'];
        }

        $locale = $params['locale'] ?? null;

        return $this->pimcoreUrl->__invoke(
            [
                'categoryname' => Text::toUrl($object->getName($locale) ? $object->getName($locale) : 'elements'),
                'category' => $object->getId(),
                'path' => $this->getNavigationPath($object, $params['rootCategory'] ?? null, $locale),
                'page' => null,
                '_locale' => $locale,
            ],
            'shop-category',
            $reset
        );
    }
}
