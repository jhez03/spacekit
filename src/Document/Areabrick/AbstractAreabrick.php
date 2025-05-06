<?php
namespace App\Document\Areabrick;

use Pimcore\Extension\Document\Areabrick\AbstractTemplateAreabrick;

abstract class AbstractAreabrick extends AbstractTemplateAreabrick
{
   public function getTemplateLocation(): string
   {
    return static::TEMPLATE_LOCATION_GLOBAL;
   }

   public function getTemplateSuffix(): string
   {
    return static::TEMPLATE_SUFFIX_TWIG;
   }

}

